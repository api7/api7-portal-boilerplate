import { createServerFn } from '@tanstack/react-start';
import { getCookie, getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';

import { isPlatformAdmin } from '../auth/admin.server';
import { auth } from '../auth/server';
import type { auth as AuthApi } from '../auth/server';
import { type UserWithTwoFactor, isTwoFactorEnabled } from '../auth/two-factor';
import { memoizeWithTtl } from '../cache';
import { getConfig } from '../config';
import { portal } from '../portal-sdk/server';

const getPublicAccessCached = memoizeWithTtl(
  () => portal.systemSetting.getPublicAccess(),
  5 * 60 * 1000,
);

async function isPublicAccessEnabled(): Promise<boolean> {
  try {
    return await getPublicAccessCached();
  } catch (error) {
    console.error('Failed to fetch portal public access setting:', error);
    return false;
  }
}

// `typeof AuthApi` (not the `auth` value import) so the client bundle's
// createServerFn split can drop the server-only auth/db chain — a
// value-position `typeof auth.api...` here would keep `auth` imported even
// after the handler body below is stripped for the client.
type Organizations = Awaited<ReturnType<typeof AuthApi.api.listOrganizations>>;

type AuthSession = NonNullable<
  Awaited<ReturnType<typeof AuthApi.api.getSession>>
>;

// What the layouts' guards need from a session, plus the decisions that can
// only be made on the server.
export interface PublicSession {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  isImpersonating: boolean;
  canAccessAdmin: boolean;
}

export interface SessionAndOrganizations {
  session: PublicSession | null;
  // Seeds better-auth-ui's own session query so its components render without
  // fetching it again.
  authSession: AuthSession | null;
  orgs: Organizations | null;
  // True when the instance requires 2FA and this session's user hasn't
  // enrolled yet — callers should redirect to /account/two-factor instead of
  // rendering their normal content. Computed here (not exposed as raw
  // config) since every session-aware beforeLoad needs this same decision.
  requiresTwoFactorEnrollment: boolean;
}

// Server-side equivalent of the old verifySessionAndOrganization DAL helper:
// route beforeLoad/loader can't call auth.api.* directly (they're isomorphic,
// this file's implementation is not), so this is the server function they
// call instead. Redirects are the caller's job — this just reports state.
export const getSessionAndOrganizations = createServerFn({ method: 'GET' })
  .validator(z.object({ respectPublicAccess: z.boolean().default(false) }))
  .handler(
    async ({
      data: { respectPublicAccess },
    }): Promise<SessionAndOrganizations & { publicAccessEnabled: boolean }> => {
      // Gates page-level access (org membership, platform-admin) on every
      // navigation, so it can't trust a stale cached cookie — a role change,
      // membership change, or ending impersonation must take effect immediately.
      const session = await auth.api.getSession({
        headers: getRequest().headers,
        query: { disableCookieCache: true },
      });
      if (!session?.user) {
        return {
          session: null,
          authSession: null,
          orgs: null,
          publicAccessEnabled: respectPublicAccess
            ? await isPublicAccessEnabled()
            : false,
          requiresTwoFactorEnrollment: false,
        };
      }

      const orgs = await auth.api.listOrganizations({
        headers: getRequest().headers,
      });
      const isImpersonating = !!session.session.impersonatedBy;
      return {
        session: {
          user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
          },
          isImpersonating,
          canAccessAdmin: !isImpersonating && isPlatformAdmin(session.user),
        },
        authSession: session,
        orgs,
        publicAccessEnabled: false,
        requiresTwoFactorEnrollment:
          getConfig().auth.twoFactor.required &&
          !isTwoFactorEnabled(session.user as UserWithTwoFactor),
      };
    },
  );

// Better Auth sets this cookie after the password step of a 2FA sign-in; its name isn't exported.
export const hasTwoFactorChallengeCookie = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { name } = (await auth.$context).createAuthCookie('two_factor');
  return !!getCookie(name);
});
