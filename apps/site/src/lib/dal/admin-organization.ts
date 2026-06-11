import 'server-only';

import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';
import {
  members as member,
  organizations as organization,
  users as user,
} from '@/lib/db/schema';
import { API7Portal } from '@api7/portal-sdk';
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

export type ListAdminOrganizationsParams = {
  page: number;
  pageSize: number;
  search?: string;
  userId?: string;
  orderBy: 'created_at';
  direction: 'asc' | 'desc';
};

export type AdminOrganizationListItem = {
  id: string;
  name: string;
  slug: string;
  created_at: Date;
  application_count: number;
  owner: {
    user_id: string;
    name: string | null;
    email: string;
    created_at: Date;
  } | null;
};

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

const getPortalForOrganization = (organizationId: string) => {
  const portalConfig = getConfig().portal;
  return new API7Portal({
    endpoint: portalConfig.url,
    token: portalConfig.token,
    getDeveloperId: async () => organizationId,
  });
};

const getApplicationCount = async (organizationId: string) => {
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
      `Failed to fetch application count for organization ${organizationId}:`,
      error,
    );
    return 0;
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

export const listAdminOrganizations = async ({
  page,
  pageSize,
  search,
  userId,
  direction,
}: ListAdminOrganizationsParams) => {
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
  const where = searchWhere && userWhere ? and(searchWhere, userWhere) : (searchWhere ?? userWhere);
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
    Promise.all(
      organizationIds.map(
        async (organizationId): Promise<readonly [string, number]> => [
          organizationId,
          await getApplicationCount(organizationId),
        ],
      ),
    ),
  ]);

  const applicationCountMap = new Map<string, number>(applicationCounts);

  return {
    list: organizations.map(
      (item): AdminOrganizationListItem => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        created_at: item.createdAt,
        application_count: applicationCountMap.get(item.id) ?? 0,
        owner: owners.get(item.id) ?? null,
      }),
    ),
    page,
    page_size: pageSize,
    total: totalResult[0]?.total ?? 0,
  };
};
