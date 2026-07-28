import { getCookieCache } from 'better-auth/cookies';
import type { NextProxy } from 'next/server';
import { NextResponse } from 'next/server';

import { AUTH_BASE_PATH } from '@/constants/api-prefix';
import { PATH_AUTH, PATH_TWO_FACTOR } from '@/constants/path-prefix';
import { isTwoFactorEnabled, type UserWithTwoFactor } from '@/lib/auth/two-factor';
import { getConfig } from '@/lib/config';

// Routes that must stay reachable regardless of 2FA enrollment status:
// auth pages themselves (incl. the two-factor enrollment page), Better Auth's
// own API handler, and always-public docs content.
const TWO_FACTOR_EXEMPT_PREFIXES = [
  PATH_AUTH,
  AUTH_BASE_PATH,
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
    // Cookie cache is a signed, HMAC-verified cookie read locally — no DB/network
    // round trip, so it can't fail the way auth.api.getSession() could. A missing
    // or invalid cache is treated as "no session"; the authoritative, DB-backed
    // 2FA check still runs in the proxy route handler for actual API writes.
    let session: Awaited<ReturnType<typeof getCookieCache>> = null;
    try {
      session = await getCookieCache(request, { secret: authConfig.secret });
    } catch (error) {
      console.error('Failed to read session cookie cache in 2FA enforcement proxy:', error);
    }
    if (session && !isTwoFactorEnabled(session.user as UserWithTwoFactor)) {
      const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      const url = new URL(
        `${PATH_TWO_FACTOR}?redirect=${encodeURIComponent(redirectTarget)}`,
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
