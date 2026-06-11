import 'server-only';

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { isImpersonatingSession } from '@/lib/auth/admin';
import { isPlatformAdmin } from '@/lib/auth/admin.server';
import { auth } from '@/lib/auth/server';
import { portal } from '@/lib/portal-sdk/server';
import { APIError } from '@api7/portal-sdk';

/**
 * Shared handler for accept/reject. Platform-admin only. Approvals are an
 * org-independent platform-admin action. The Control Plane records a fixed
 * marker as the operator for developer-portal calls, so we forward the acting
 * admin's identity (id + name) as a JSON `metadata` string; consumers read it
 * back when they see the marker.
 */
export const actOnApproval = async (
  approvalId: string,
  action: 'accept' | 'reject',
): Promise<NextResponse> => {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (
    !session?.user ||
    !isPlatformAdmin(session.user) ||
    isImpersonatingSession(session.session.impersonatedBy)
  ) {
    return NextResponse.json(
      { message: 'Forbidden. Approvals are restricted to platform admins.' },
      { status: 403 },
    );
  }

  try {
    await portal.approval[action](approvalId, {
      metadata: JSON.stringify({
        operator_id: session.user.id,
        operator_name: session.user.name,
      }),
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (APIError.isAPIError(error)) {
      return NextResponse.json(
        { status: error.status, message: error.message },
        { status: error.status || 500 },
      );
    }
    console.error(`Approval ${action} error`, {
      action,
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
};
