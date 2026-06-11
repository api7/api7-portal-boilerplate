import { NextRequest, NextResponse } from 'next/server';

import { loadOrgNames } from '@/lib/approvals/enrich.server';
import { isCurrentUserPlatformAdmin } from '@/lib/auth/platform-admin.server';
import { portal } from '@/lib/portal-sdk/server';
import { APIError } from '@api7/portal-sdk';
import type { ListApprovalsData } from '@api7/portal-sdk/unstable-types';

/**
 * List approvals for the current portal. Platform-admin only.
 *
 * The applicant is captured at the organization (developer) granularity, not
 * per individual, so there is no specific person to resolve. The Control Plane
 * stores the developer id as the applicant; we resolve it to the human-readable
 * organization name (`applicant_org_name`) from the Better Auth database here,
 * since that name only exists in this portal.
 */
export async function GET(request: NextRequest) {
  if (!(await isCurrentUserPlatformAdmin())) {
    return NextResponse.json(
      { message: 'Forbidden. Approvals are restricted to platform admins.' },
      { status: 403 },
    );
  }

  try {
    // The approval filters surfaced in the UI are single-value per key, matching
    // the SDK's typed query; flatten the search params into a plain object.
    const body = await portal.approval.list(
      Object.fromEntries(
        request.nextUrl.searchParams,
      ) as ListApprovalsData['query'],
    );
    const list = body.list ?? [];
    const orgNames = await loadOrgNames(
      list.map((a) => a.applicant_name ?? '').filter(Boolean),
    );
    const enriched = list.map((a) => ({
      ...a,
      applicant_org_name: a.applicant_name
        ? orgNames[a.applicant_name]
        : undefined,
    }));

    return NextResponse.json(
      { list: enriched, total: body.total ?? enriched.length },
      { status: 200 },
    );
  } catch (error) {
    if (APIError.isAPIError(error)) {
      return NextResponse.json(
        { status: error.status, message: error.message },
        { status: error.status || 500 },
      );
    }
    console.error(
      'Approvals list error:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
