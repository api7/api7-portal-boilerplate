'use server';

import { headers } from 'next/headers';

import { APIError as SDKAPIError } from '@api7/portal-sdk';
import { and, eq } from 'drizzle-orm';

import { getCurrentPlatformAdminSession } from '@/lib/auth/platform-admin.server';
import { db } from '@/lib/db';
import { members, organizations, sessions } from '@/lib/db/schema';
import { portal } from '@/lib/portal-sdk/server';

export async function takeoverOrganization(organizationId: string): Promise<void> {
  const session = await getCurrentPlatformAdminSession(await headers());
  if (!session) {
    throw new Error('Forbidden. Takeover is restricted to platform admins.');
  }

  const adminUserId = session.user.id;

  const existing = await db
    .select({ id: members.id, role: members.role })
    .from(members)
    .where(and(eq(members.organizationId, organizationId), eq(members.userId, adminUserId)))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].role === 'owner') return;
    await db
      .update(members)
      .set({ role: 'owner' })
      .where(eq(members.id, existing[0].id));
    return;
  }

  await db.insert(members).values({
    id: crypto.randomUUID(),
    organizationId,
    userId: adminUserId,
    role: 'owner',
    createdAt: new Date(),
  });
}

export async function deleteOrganizationAsAdmin(organizationId: string): Promise<void> {
  const session = await getCurrentPlatformAdminSession(await headers());
  if (!session) {
    throw new Error('Forbidden. Organization deletion is restricted to platform admins.');
  }

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
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
      );
    }
  }

  // Nullify stale activeOrganizationId references (no FK constraint).
  await db
    .update(sessions)
    .set({ activeOrganizationId: null })
    .where(eq(sessions.activeOrganizationId, organizationId));

  // Delete org; members + invitations cascade automatically.
  await db.delete(organizations).where(eq(organizations.id, organizationId));
}
