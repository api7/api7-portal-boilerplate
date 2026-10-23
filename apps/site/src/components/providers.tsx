import { getSafeRedirectTo } from '@better-auth-ui/core';
import { magicLinkPlugin } from '@better-auth-ui/core/plugins/magic-link';
import { providerIcons } from '@better-auth-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import type { SocialProvider } from 'better-auth/social-providers';
import { ThemeProvider } from 'next-themes';
import Link from 'next/link';
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';

import { AuthProvider } from '@/components/auth/auth-provider';
import {
  PATH_ACCOUNT_SECURITY,
  PATH_ACCOUNT_TWO_FACTOR,
} from '@/constants/path-prefix';
import { authClient } from '@/lib/auth/client';
import { organizationPlugin } from '@/lib/auth/organization-plugin';
import { twoFactorPlugin } from '@/lib/auth/two-factor-plugin';
import type { ConfigStatus } from '@/lib/config/config-status';
import { ConfigStatusProvider } from '@/lib/config/config-status-context';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import { invalidateSession } from '@/lib/query/session';

const authLocalization = { auth: { emailPlaceholder: 'name@company.com' } };

function AuthProviderWrapper({
  children,
  initialConfigStatus,
  baseURL,
}: {
  children: ReactNode;
  initialConfigStatus: ConfigStatus;
  baseURL: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeOrgSlug = useOrganizationSlug();

  useEffect(() => {
    const { $sessionSignal, $listOrg, $activeMemberRoleSignal } =
      authClient.$store.atoms;
    const unsubscribes = [
      $sessionSignal,
      $listOrg,
      $activeMemberRoleSignal,
    ].map((atom) => atom.listen(() => void invalidateSession(queryClient)));
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [queryClient]);

  // When the active org's slug changes (e.g. user renames it in settings),
  // replace the stale slug in the current URL so a page refresh won't 404.
  const prevActiveOrgSlugRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeOrgSlug) {
      prevActiveOrgSlugRef.current = null;
      return;
    }
    const prevSlug = prevActiveOrgSlugRef.current;
    prevActiveOrgSlugRef.current = activeOrgSlug;
    if (!prevSlug || prevSlug === activeOrgSlug) return;

    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname;
    if (currentPath === `/${prevSlug}`) {
      router.navigate({
        href: `/${activeOrgSlug}` + window.location.search,
        replace: true,
      });
    } else if (currentPath.startsWith(`/${prevSlug}/`)) {
      const newPath = currentPath.replace(
        `/${prevSlug}/`,
        `/${activeOrgSlug}/`,
      );
      router.navigate({
        href: newPath + window.location.search,
        replace: true,
      });
    }
  }, [activeOrgSlug, router]);

  // `redirectTo` passed to `navigate` may carry an unvalidated cross-origin
  // target (from the raw `?redirectTo=` query param), so it's re-validated
  // here — the one place every current and future caller routes through.
  const navigate = useCallback(
    ({ to, replace }: { to: string; replace?: boolean }) => {
      const target = getSafeRedirectTo(to, baseURL);
      // Auth signals fire on a delay, so drop the cached session before the next beforeLoad reads it.
      void invalidateSession(queryClient);
      router.navigate({ href: target, replace });
    },
    [router, baseURL, queryClient],
  );

  const plugins = useMemo(() => {
    const list = [
      organizationPlugin({
        slug: activeOrgSlug ?? null,
        allowMultipleRoles: false,
        viewPaths: {
          settings: { organizations: 'organizations' },
          organization: { settings: 'settings', people: 'members' },
        },
      }),
    ];

    if (initialConfigStatus.magicLink) {
      list.push(magicLinkPlugin() as never);
    }

    if (initialConfigStatus.twoFactor) {
      list.push(
        twoFactorPlugin({
          paths: {
            setup: PATH_ACCOUNT_TWO_FACTOR,
            security: PATH_ACCOUNT_SECURITY,
          },
        }) as never,
      );
    }

    return list;
  }, [
    activeOrgSlug,
    initialConfigStatus.magicLink,
    initialConfigStatus.twoFactor,
  ]);

  // Patch providerIcons for any generic OAuth provider that lacks a built-in icon,
  // so <ProviderButton> doesn't crash on "React.createElement: type is invalid".
  // Includes ssoOnly providers, since they render on the SSO-redirect step of
  // the sign-in form. Run directly (not in useMemo) — this is an idempotent
  // side effect, not a computed value, and initialConfigStatus is stable for
  // the lifetime of the app.
  initialConfigStatus.genericOAuthProviders.forEach(({ provider }) => {
    (providerIcons as Record<string, unknown>)[provider] ??= () => null;
  });

  // Merge configured social and generic OAuth providers into a single list.
  // ssoOnly providers are excluded — they're triggered via email domain policy,
  // not shown as buttons on the main sign-in page.
  const socialProviders = useMemo<SocialProvider[] | undefined>(() => {
    const providers: string[] = [
      ...(initialConfigStatus.socialProviders ?? []),
      ...initialConfigStatus.genericOAuthProviders
        .filter((p) => !p.ssoOnly)
        .map((p) => p.provider),
    ];
    return providers.length > 0 ? (providers as SocialProvider[]) : undefined;
  }, [
    initialConfigStatus.socialProviders,
    initialConfigStatus.genericOAuthProviders,
  ]);

  return (
    <ConfigStatusProvider value={initialConfigStatus}>
      <AuthProvider
        authClient={authClient}
        navigate={navigate}
        baseURL={baseURL}
        Link={Link as never}
        basePaths={{ auth: '/auth', settings: '/account', organization: '' }}
        viewPaths={{ settings: { account: 'settings', security: 'security' } }}
        plugins={plugins}
        localization={authLocalization}
        {...(socialProviders && { socialProviders })}
        {...(initialConfigStatus.twoFactor && {
          twoFactor: ['totp'] as ['totp'],
        })}
        emailAndPassword={{
          enabled: initialConfigStatus.emailAndPasswordEnabled,
          requireEmailVerification: initialConfigStatus.requireEmailVerification,
        }}
      >
        {children}
      </AuthProvider>
    </ConfigStatusProvider>
  );
}

export function Providers({
  children,
  initialConfigStatus,
  baseURL,
}: {
  children: ReactNode;
  initialConfigStatus: ConfigStatus;
  baseURL: string;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProviderWrapper
        initialConfigStatus={initialConfigStatus}
        baseURL={baseURL}
      >
        {children}
      </AuthProviderWrapper>
    </ThemeProvider>
  );
}
