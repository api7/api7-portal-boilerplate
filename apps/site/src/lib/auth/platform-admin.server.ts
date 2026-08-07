import 'server-only';

import { ensureSession } from '@better-auth-ui/react/server';
import { headers as nextHeaders } from 'next/headers';

import { getQueryClient } from '@/lib/req';
import { isImpersonatingSession } from './admin';
import { isPlatformAdmin } from './admin.server';
import { auth } from './server';

type CurrentSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export class PlatformAdminRequiredError extends Error {
  constructor() {
    super('Forbidden. Platform admin access is required.');
    this.name = 'PlatformAdminRequiredError';
  }
}

type SessionOptions = {
  /**
   * Force a fresh DB read instead of trusting the (up to `cookieCache.maxAge`
   * old) cached session cookie. Required for any check that gates a write —
   * a role change or revoked session must take effect immediately, not after
   * the cache expires. Bypasses the TanStack Query wrapper entirely (its
   * query key doesn't vary by params, so going through it here could still
   * hand back an earlier cached-cookie read from the same request).
   */
  disableCookieCache?: boolean;
};

const getCurrentSession = async (
  requestHeaders?: Headers,
  options: SessionOptions = {},
): Promise<CurrentSession | null> => {
  const headers = requestHeaders ?? (await nextHeaders());
  if (options.disableCookieCache) {
    return auth.api
      .getSession({ headers, query: { disableCookieCache: true } })
      .catch(() => null);
  }
  return ensureSession(getQueryClient(), auth, { headers }).catch(() => null);
};

export const getCurrentPlatformAdminSession = async (
  requestHeaders?: Headers,
  options: SessionOptions = {},
): Promise<NonNullable<CurrentSession> | null> => {
  const session = await getCurrentSession(requestHeaders, options);

  if (
    !session?.user ||
    isImpersonatingSession(session.session.impersonatedBy)
  ) {
    return null;
  }

  return isPlatformAdmin(session.user) ? session : null;
};

export const assertCurrentPlatformAdmin = async (
  requestHeaders?: Headers,
  options: SessionOptions = {},
): Promise<void> => {
  if (!(await getCurrentPlatformAdminSession(requestHeaders, options))) {
    throw new PlatformAdminRequiredError();
  }
};
