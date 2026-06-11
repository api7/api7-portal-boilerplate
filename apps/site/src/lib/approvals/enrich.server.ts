import 'server-only';

import { inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';

/**
 * Resolve organization names for approval applicants.
 *
 * The Control Plane stores the developer id as the applicant, which for
 * portal-registered developers equals the Better Auth `organizations.id`. That
 * id is opaque, so we look up the human-readable organization name here (the
 * only place that data exists). Ids that don't resolve (developers created
 * outside this portal) are simply omitted, and callers fall back to the raw
 * value.
 */
export const loadOrgNames = async (
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
