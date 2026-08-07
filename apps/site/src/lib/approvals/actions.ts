'use server';

import { headers } from 'next/headers';

import { APIError } from '@api7/portal-sdk';

import { getCurrentPlatformAdminSession } from '@/lib/auth/platform-admin.server';
import { portal } from '@/lib/portal-sdk/server';

export async function actOnApproval(
  approvalId: string,
  action: 'accept' | 'reject',
): Promise<void> {
  // This gates a portal-SDK write, so the session check must not trust a
  // stale cookie cache — a just-revoked admin must not be able to sneak a
  // write through before the cache expires.
  const session = await getCurrentPlatformAdminSession(await headers(), {
    disableCookieCache: true,
  });
  if (!session) {
    throw new Error('Forbidden. Approvals are restricted to platform admins.');
  }

  try {
    await portal.approval[action](approvalId, {
      metadata: JSON.stringify({
        operator_id: session.user.id,
        operator_name: session.user.name,
      }),
    });
  } catch (error) {
    if (APIError.isAPIError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Operation failed. Please try again.');
  }
}
