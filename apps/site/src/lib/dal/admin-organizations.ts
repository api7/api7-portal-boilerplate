import { APIError as SDKAPIError } from '@api7/portal-sdk';
import { createServerFn } from '@tanstack/react-start';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
} from 'drizzle-orm';
import { z } from 'zod';

import { MAX_PAGE_SIZE } from '@/constants/common';
import { platformAdminMiddleware } from '../auth/middleware';
import { db } from '../db';
import {
  members as member,
  organizations as organization,
  sessions,
  users as user,
} from '../db/schema';
import { getPortalForOrganization, portal } from '../portal-sdk/server';

export type AdminOrganizationListItem = {
  id: string;
  name: string;
  slug: string;
  created_at: Date;
  // null means the count couldn't be fetched — distinct from a true zero.
  application_count: number | null;
  owner: {
    user_id: string;
    name: string | null;
    email: string;
    created_at: Date;
  } | null;
};

// Runs `fn` over `items` with at most `limit` calls in flight at once.
const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
};

const APPLICATION_COUNT_CONCURRENCY = 10;

const buildOrganizationWhere = (search?: string) => {
  if (!search) {
    return undefined;
  }

  const escapedSearch = search.replace(/[\\%_]/g, '\\$&');
  const keyword = `%${escapedSearch}%`;
  return or(
    ilike(organization.name, keyword),
    ilike(organization.slug, keyword),
  );
};

const getApplicationCount = async (
  organizationId: string,
): Promise<number | null> => {
  try {
    const res = await getPortalForOrganization(organizationId).application.list(
      {
        page: 1,
        page_size: 1,
      },
    );
    return res.total ?? 0;
  } catch (error) {
    console.error(
      `Failed to fetch application count for organization ${organizationId}: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
    return null;
  }
};

const getOwnersByOrganizationIds = async (organizationIds: string[]) => {
  if (!organizationIds.length) {
    return new Map<string, AdminOrganizationListItem['owner']>();
  }

  const ownerRows = await db
    .select({
      organizationId: member.organizationId,
      userId: user.id,
      name: user.name,
      email: user.email,
      createdAt: member.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(
      and(
        inArray(member.organizationId, organizationIds),
        eq(member.role, 'owner'),
        or(isNull(user.banned), eq(user.banned, false)),
      ),
    )
    .orderBy(asc(member.createdAt), asc(member.id));

  const owners = new Map<string, AdminOrganizationListItem['owner']>();
  for (const row of ownerRows) {
    if (owners.has(row.organizationId)) {
      continue;
    }

    owners.set(row.organizationId, {
      user_id: row.userId,
      name: row.name,
      email: row.email,
      created_at: row.createdAt,
    });
  }

  return owners;
};

const listAdminOrganizationsSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.number().int().positive().max(MAX_PAGE_SIZE),
  search: z.string().optional(),
  user_id: z.string().optional(),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export const listAdminOrganizations = createServerFn({ method: 'GET' })
  .middleware([platformAdminMiddleware])
  .validator(listAdminOrganizationsSchema)
  .handler(
    async ({
      data: { page, page_size: pageSize, search, user_id: userId, direction },
    }) => {
      const searchWhere = buildOrganizationWhere(search);
      const userWhere = userId
        ? inArray(
            organization.id,
            db
              .select({ id: member.organizationId })
              .from(member)
              .where(eq(member.userId, userId)),
          )
        : undefined;
      const where =
        searchWhere && userWhere
          ? and(searchWhere, userWhere)
          : (searchWhere ?? userWhere);
      const offset = (page - 1) * pageSize;
      const orderColumn = organization.createdAt;
      const orderDirection =
        direction === 'asc' ? asc(orderColumn) : desc(orderColumn);

      const [organizations, totalResult] = await Promise.all([
        db
          .select({
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            createdAt: organization.createdAt,
          })
          .from(organization)
          .where(where)
          .orderBy(orderDirection)
          .limit(pageSize)
          .offset(offset),
        db.select({ total: count() }).from(organization).where(where),
      ]);

      const organizationIds = organizations.map((item) => item.id);
      const [owners, applicationCounts] = await Promise.all([
        getOwnersByOrganizationIds(organizationIds),
        mapWithConcurrency(
          organizationIds,
          APPLICATION_COUNT_CONCURRENCY,
          async (organizationId): Promise<readonly [string, number | null]> => [
            organizationId,
            await getApplicationCount(organizationId),
          ],
        ),
      ]);

      const applicationCountMap = new Map<string, number | null>(
        applicationCounts,
      );

      return {
        list: organizations.map(
          (item): AdminOrganizationListItem => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            created_at: item.createdAt,
            application_count: applicationCountMap.get(item.id) ?? null,
            owner: owners.get(item.id) ?? null,
          }),
        ),
        page,
        page_size: pageSize,
        total: totalResult[0]?.total ?? 0,
      };
    },
  );

const organizationIdSchema = z.string().min(1);

export const takeoverOrganization = createServerFn({ method: 'POST' })
  .middleware([platformAdminMiddleware])
  .validator(organizationIdSchema)
  .handler(async ({ data: organizationId, context }) => {
    const adminUserId = context.session.user.id;

    await db.transaction(async (tx) => {
      const [org] = await tx
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);
      if (!org) throw new Error('Organization not found.');

      const existing = await tx
        .select({ id: member.id, role: member.role })
        .from(member)
        .where(
          and(
            eq(member.organizationId, organizationId),
            eq(member.userId, adminUserId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        if (existing[0].role === 'owner') return;
        await tx
          .update(member)
          .set({ role: 'owner' })
          .where(eq(member.id, existing[0].id));
        return;
      }

      await tx.insert(member).values({
        id: crypto.randomUUID(),
        organizationId,
        userId: adminUserId,
        role: 'owner',
        createdAt: new Date(),
      });
    });
  });

export const deleteOrganizationAsAdmin = createServerFn({ method: 'POST' })
  .middleware([platformAdminMiddleware])
  .validator(organizationIdSchema)
  .handler(async ({ data: organizationId }) => {
    const [org] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);
    if (!org) throw new Error('Organization not found.');

    // Mirror the beforeDeleteOrganization hook: clean up portal developer.
    try {
      await portal.developer.delete(organizationId);
    } catch (error) {
      if (!(SDKAPIError.isAPIError(error) && error.status === 404)) {
        throw new Error(
          SDKAPIError.isAPIError(error) && error.message
            ? error.message
            : 'Failed to delete developer resources.',
          { cause: error },
        );
      }
    }

    try {
      await db.transaction(async (tx) => {
        // Nullify stale activeOrganizationId references (no FK constraint).
        await tx
          .update(sessions)
          .set({ activeOrganizationId: null })
          .where(eq(sessions.activeOrganizationId, organizationId));

        // Delete org; members + invitations cascade automatically.
        await tx
          .delete(organization)
          .where(eq(organization.id, organizationId));
      });
    } catch (error) {
      // The portal developer resources are already gone at this point and
      // can't be recreated — this org is now orphaned locally and needs
      // manual cleanup.
      console.error(
        `Portal developer resources for organization ${organizationId} were deleted, ` +
          `but the local database cleanup failed: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
      );
      throw error;
    }
  });
