import { API_PREFIX } from '@/constants/api-prefix';
import { isOwnerOrAdminRole } from '@/lib/auth/role';
import { auth } from '@/lib/auth/server';
import { portal } from '@/lib/portal-sdk/server';
import { ReqError } from '@/types/portal-sdk';
import { isAxiosError } from 'axios';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/** Resources accessible via org-scoped URLs: /api/{slug}/{resource}/... */
const ORG_SCOPED_RESOURCES = new Set([
  'api_products',
  'applications',
  'credentials',
  'subscriptions',
  'dcr_providers',
]);

/** Org-scoped resources where members can only read; writes require owner/admin. */
const MEMBER_READONLY_PREFIXES = new Set([
  'applications',
  'credentials',
  'subscriptions',
]);

/** Resources where only GET is meaningful; backend exposes no write endpoints. */
const GET_ONLY_RESOURCES = new Set(['api_products', 'dcr_providers']);

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ slug: string; proxy?: string[] }> },
) {
  try {
    const { slug, proxy } = await context.params;
    const { searchParams } = request.nextUrl;
    const reqHeaders = await headers();

    // No resource segment — /api/{slug} alone is not a valid org-scoped path.
    if (!proxy?.length) {
      return new NextResponse(null, { status: 404 });
    }

    const resource = proxy[0];

    if (!ORG_SCOPED_RESOURCES.has(resource)) {
      return new NextResponse(null, { status: 404 });
    }

    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized. Sign in is required.' },
        { status: 401 },
      );
    }

    const orgs = await auth.api.listOrganizations({ headers: reqHeaders });
    const org = orgs.find((o) => o.slug === slug);
    if (!org) {
      return new NextResponse(null, { status: 404 });
    }

    if (GET_ONLY_RESOURCES.has(resource) && WRITE_METHODS.has(request.method)) {
      return new NextResponse(null, { status: 405 });
    }

    if (MEMBER_READONLY_PREFIXES.has(resource) && WRITE_METHODS.has(request.method)) {
      const activeMember = await auth.api.getActiveMemberRole({
        headers: reqHeaders,
        query: { organizationSlug: slug },
      });
      if (!isOwnerOrAdminRole(activeMember?.role)) {
        return NextResponse.json(
          {
            message: `Forbidden. Member role is read-only for ${resource} in current organization.`,
          },
          { status: 403 },
        );
      }
    }

    const config: {
      params: Record<string, string>;
      data?: unknown;
      headers: Record<string, string>;
    } = {
      params: Object.fromEntries(searchParams),
      headers: { 'X-Portal-Developer-ID': org.id },
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        config.data = await request.json();
      } else if (contentType) {
        config.data = await request.text();
      }
    }

    const path = `${API_PREFIX}/${proxy.join('/')}`;
    const response = await portal.proxy({ method: request.method, url: path, ...config });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    if (response.status === 404) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status || 500;
      if (status === 404) {
        return new NextResponse(null, { status: 404 });
      }
      const err = error.response?.data as ReqError | undefined;
      return NextResponse.json(err ?? { message: 'Internal server error' }, { status: err?.status || status });
    }
    console.error('Proxy request error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ message: 'Proxy server error' }, { status: 500 });
  }
}

export {
  proxyRequest as DELETE,
  proxyRequest as GET,
  proxyRequest as PATCH,
  proxyRequest as POST,
  proxyRequest as PUT,
};
