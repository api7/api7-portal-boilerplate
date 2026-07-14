import type { NextProxy } from 'next/server';
import { NextResponse } from 'next/server';

import { PATH_AUTH, PATH_TWO_FACTOR } from '@/constants/path-prefix';
import { auth } from '@/lib/auth/server';
import { getConfig } from '@/lib/config';

// Routes that must stay reachable regardless of 2FA enrollment status:
// auth pages themselves (incl. the two-factor enrollment page), Better Auth's
// own API handler, and always-public docs content.
const TWO_FACTOR_EXEMPT_PREFIXES = [
  PATH_AUTH,
  '/api',
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
    const session = await auth.api.getSession({ headers: request.headers });
    const twoFactorEnabled = !!(session?.user as { twoFactorEnabled?: boolean } | undefined)
      ?.twoFactorEnabled;

    if (session && !twoFactorEnabled) {
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
