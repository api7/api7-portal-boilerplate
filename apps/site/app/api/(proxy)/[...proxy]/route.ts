import { API_PREFIX } from '@/constants/api-prefix';
import { isOwnerOrAdminRole } from '@/lib/auth/role';
import { auth } from '@/lib/auth/server';
import { portal } from '@/lib/portal-sdk/server';
import { ReqError } from '@/types/portal-sdk';
import { isAxiosError } from 'axios';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const MEMBER_READONLY_PREFIXES = new Set([
  'applications',
  'credentials',
  'subscriptions',
]);

/** Top-level portal API resource names — used to distinguish org slugs from API paths. */
const KNOWN_API_RESOURCES = new Set([
  ...MEMBER_READONLY_PREFIXES,
  'developers',
  'api_products',
  'system_settings',
  'dcr_providers',
]);

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const getErrorLog = (error: unknown) => {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  return String(error);
};

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ proxy: string[] }> },
) {
  try {
    const { proxy } = await context.params;
    const { searchParams } = request.nextUrl;
    const reqHeaders = await headers();

    // Detect org-slug-prefixed API calls (/api/{slug}/applications).
    // proxy[0] is an org slug when it's not a known API resource AND
    // there is at least one more path segment following it.
    let orgSlug: string | null = null;
    let apiPathSegments = proxy;
    if (proxy.length >= 2 && !KNOWN_API_RESOURCES.has(proxy[0])) {
      orgSlug = proxy[0];
      apiPathSegments = proxy.slice(1);
    }
    const topLevelResource = apiPathSegments[0];
    const path = `${API_PREFIX}/${apiPathSegments.join('/')}`;

    if (topLevelResource === 'developers') {
      const session = await auth.api.getSession({
        headers: reqHeaders,
      });

      if (!session?.user) {
        return NextResponse.json(
          {
            message: 'Unauthorized. Sign in is required for developer APIs.',
          },
          { status: 401 },
        );
      }
    }

    if (
      topLevelResource &&
      MEMBER_READONLY_PREFIXES.has(topLevelResource) &&
      WRITE_METHODS.has(request.method)
    ) {
      const activeMember = await auth.api.getActiveMemberRole({
        headers: reqHeaders,
        query: orgSlug ? { organizationSlug: orgSlug } : undefined,
      });

      if (!isOwnerOrAdminRole(activeMember?.role)) {
        return NextResponse.json(
          {
            message: `Forbidden. Member role is read-only for ${topLevelResource} in current organization.`,
          },
          { status: 403 },
        );
      }
    }

    // When org slug is present, resolve it to an org ID and pre-set the
    // X-Portal-Developer-ID header so the portal SDK interceptor does not need
    // to infer developer identity from session state.
    const config: {
      params: Record<string, string>;
      data?: unknown;
      headers?: Record<string, string>;
    } = {
      params: Object.fromEntries(searchParams),
    };

    if (orgSlug) {
      const orgs = await auth.api.listOrganizations({
        headers: reqHeaders,
      });
      const org = orgs.find((o) => o.slug === orgSlug);
      if (!org) {
        return NextResponse.json(
          { message: 'Organization not found or access denied' },
          { status: 404 },
        );
      }
      config.headers = {
        ...config.headers,
        'X-Portal-Developer-ID': org.id,
      };
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        config.data = await request.json();
      } else if (contentType) {
        config.data = await request.text();
      }
    }

    const response = await portal.proxy({
      method: request.method,
      url: path,
      ...config,
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    if (isAxiosError(error)) {
      const err = error.response?.data as ReqError;
      return NextResponse.json(err, { status: err.status || 500 });
    }
    console.error('Proxy request error:', getErrorLog(error));
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

export {
  proxyRequest as GET,
  proxyRequest as POST,
  proxyRequest as PUT,
  proxyRequest as DELETE,
  proxyRequest as PATCH,
};
