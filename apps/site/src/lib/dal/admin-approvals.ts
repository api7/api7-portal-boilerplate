import { APIError } from '@api7/portal-sdk';
import { createServerFn } from '@tanstack/react-start';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';

import { MAX_PAGE_SIZE } from '@/constants/common';
import { platformAdminMiddleware } from '../auth/middleware';
import { db } from '../db';
import { organizations } from '../db/schema';
import type { Approval } from '../portal-sdk/approval';
import { portal } from '../portal-sdk/server';

// Resolves applicant developer ids (== Better Auth organization ids) to
// human-readable org names; unresolvable ids are omitted.
const loadOrgNames = async (
  orgIds: string[],
): Promise<Record<string, string>> => {
  const ids = [...new Set(orgIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const rows = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(inArray(organizations.id, ids));

  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.name) result[row.id] = row.name;
  }
  return result;
};

const listApprovalsSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.number().int().positive().max(MAX_PAGE_SIZE),
  search: z.string().optional(),
  order_by: z.enum(['applied_at', 'resource_name', 'operated_at']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

export const listApprovals = createServerFn({ method: 'GET' })
  .middleware([platformAdminMiddleware])
  .validator(listApprovalsSchema)
  .handler(async ({ data: query }) => {
    const body = await portal.approval.list(query);
    const list = body.list ?? [];
    const orgNames = await loadOrgNames(
      list.map((a) => a.applicant_name ?? '').filter(Boolean),
    );
    const enriched: Approval[] = list.map((a) => ({
      ...(a as unknown as Approval),
      applicant_org_name: a.applicant_name
        ? orgNames[a.applicant_name]
        : undefined,
    }));
    return { list: enriched, total: body.total ?? enriched.length };
  });

const actOnApprovalSchema = z.object({
  approvalId: z.string().min(1),
  action: z.enum(['accept', 'reject']),
});

export const actOnApproval = createServerFn({ method: 'POST' })
  .middleware([platformAdminMiddleware])
  .validator(actOnApprovalSchema)
  .handler(async ({ data: { approvalId, action }, context }) => {
    try {
      await portal.approval[action](approvalId, {
        metadata: JSON.stringify({
          operator_id: context.session.user.id,
          operator_name: context.session.user.name,
        }),
      });
    } catch (error) {
      if (APIError.isAPIError(error)) {
        throw new Error(error.message, { cause: error });
      }
      throw new Error('Operation failed. Please try again.', { cause: error });
    }
  });
