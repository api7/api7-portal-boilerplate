// Talks to the Portal API directly (Authorization bearer token +
// X-Portal-Developer-ID header) for test setup/teardown, independent of
// whichever devportal app's proxy/RPC surface is under test.
import { request } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

import { getPortalToken } from '../utils/devportal-config';

// The local developer portal API endpoint (default port 4321).
const PORTAL_API_URL = `http://127.0.0.1:${process.env.DEVELOPER_PORTAL_API_PORT || '4321'}`;

let portalCtxPromise: ReturnType<typeof request.newContext> | null = null;

const getPortalCtx = () => {
  portalCtxPromise ??= request.newContext({ baseURL: PORTAL_API_URL });
  return portalCtxPromise;
};

type Method = 'get' | 'post' | 'delete' | 'put' | 'patch';
type RequestOptions = NonNullable<Parameters<APIRequestContext['post']>[1]>;

export const portalApiRequest = async (
  organizationId: string,
  method: Method,
  path: string,
  options?: RequestOptions,
) => {
  const ctx = await getPortalCtx();
  return ctx[method](path, {
    ...options,
    headers: {
      Authorization: `Bearer ${getPortalToken()}`,
      'X-Portal-Developer-ID': organizationId,
    },
  });
};
