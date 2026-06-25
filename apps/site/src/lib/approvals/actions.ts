'use server';

import { headers } from 'next/headers';

import { APIError } from '@api7/portal-sdk';

import { getCurrentPlatformAdminSession } from '@/lib/auth/platform-admin.server';
import { portal } from '@/lib/portal-sdk/server';

export async function actOnApproval(
  approvalId: string,
  action: 'accept' | 'reject',
): Promise<void> {
  const session = await getCurrentPlatformAdminSession(await headers());
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
