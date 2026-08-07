import type { NextProxy } from 'next/server';
import { NextResponse } from 'next/server';

import { API_PREFIX, AUTH_BASE_PATH } from '@/constants/api-prefix';
import { PATH_ACCOUNT, PATH_ACCOUNT_TWO_FACTOR, PATH_AUTH } from '@/constants/path-prefix';
import { auth } from '@/lib/auth/server';
import { isTwoFactorEnabled, type UserWithTwoFactor } from '@/lib/auth/two-factor';
import { getConfig } from '@/lib/config';

// Routes that must stay reachable regardless of 2FA enrollment status: auth
// pages, account settings — including /account/two-factor itself, where
// enrollment actually happens (see two-factor-setup.tsx) — Better Auth's
// own API handler, and always-public docs content. All /api routes are also
// exempt: this is a page-redirect gate, and redirecting an API call instead
// of failing it makes callers that follow redirects see 200 (the two-factor
// page's HTML) instead of a 403. The org-scoped proxy route enforces 2FA
// itself with the proper JSON 403; other API routes don't need 2FA at all.
const TWO_FACTOR_EXEMPT_PREFIXES = [
  PATH_AUTH,
  PATH_ACCOUNT,
  AUTH_BASE_PATH,
  API_PREFIX,
  '/docs',
  '/llms.txt',
  '/llms-full.txt',
  '/llms.mdx',
];

const isTwoFactorExempt = (pathname: string) =>
  TWO_FACTOR_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export const proxy: NextProxy = async (request) => {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  const { auth: authConfig } = getConfig();
  if (authConfig.twoFactor.required && !isTwoFactorExempt(request.nextUrl.pathname)) {
    // A missing/expired cookie cache used to read as "no session" and skip
    // the redirect — fail-open. That's reachable in practice: e.g. a config
    // change that flips `twoFactor.required` on is followed by a devportal
    // restart, which alone can outlast the cache's maxAge, so a still-valid
    // but not-yet-enrolled session sails through unredirected. Force a fresh
    // DB read instead — this gate decides whether 2FA enrollment is enforced
    // at all, so it must not depend on the cache still being warm.
    let session: Awaited<ReturnType<typeof auth.api.getSession>>;
    try {
      session = await auth.api.getSession({
        headers: requestHeaders,
        query: { disableCookieCache: true },
      });
    } catch (error) {
      console.error(
        'Failed to read session in 2FA enforcement proxy:',
        error instanceof Error ? error.message : String(error),
      );
      // Can't tell whether this session is enrolled — fail closed rather
      // than silently skipping the redirect check.
      return NextResponse.json(
        { message: 'Service temporarily unavailable.' },
        { status: 503 },
      );
    }
    if (session && !isTwoFactorEnabled(session.user as UserWithTwoFactor)) {
      const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      const url = new URL(
        `${PATH_ACCOUNT_TWO_FACTOR}?redirectTo=${encodeURIComponent(redirectTarget)}`,
        request.url,
      );
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
};

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
