'use client';

import { getSafeRedirectTo } from '@better-auth-ui/core';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/components/auth/auth-provider';
import { organizationPlugin } from '@/lib/auth/organization-plugin';
import type { ConfigStatus } from '@/lib/config/config-status';
import { ConfigStatusProvider } from '@/lib/config/config-status-context';
import { authClient } from '@/lib/auth/client';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import { getQueryClient } from '@/lib/req';
import { magicLinkPlugin } from '@better-auth-ui/core/plugins';
import { twoFactorPlugin } from '@/lib/auth/two-factor-plugin';
import { providerIcons } from '@better-auth-ui/react';
import type { SocialProvider } from 'better-auth/social-providers';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';


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
  const activeOrgSlug = useOrganizationSlug();

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
    if (currentPath.startsWith(`/${prevSlug}/`)) {
      const newPath = currentPath.replace(`/${prevSlug}/`, `/${activeOrgSlug}/`);
      router.replace(newPath + window.location.search);
    }
  }, [activeOrgSlug, router]);

  // better-auth-ui's own `useAuth().redirectTo` reflects the raw `?redirectTo=`
  // query param with no origin validation (it's just `.trim()`'d — see
  // `@better-auth-ui/react`'s AuthProvider). Several consumers — ours
  // (sign-up.tsx) and upstream's (two-factor-challenge.tsx, one-tap-plugin.tsx,
  // use-authenticate.ts) — pass that value straight to `navigate({ to })`.
  // `navigate` is never legitimately used for cross-origin navigation in this
  // app (social/OAuth sign-in redirects bypass it entirely), so it's safe —
  // and is the one place we can fix this for every current and future caller
  // without patching any registry/upstream file.
  const navigate = useCallback(
    ({ to, replace }: { to: string; replace?: boolean }) => {
      const target = getSafeRedirectTo(to, baseURL);
      if (replace) router.replace(target);
      else router.push(target);
    },
    [router, baseURL],
  );

  const plugins = useMemo(() => {
    const list = [
      organizationPlugin({
        slug: activeOrgSlug ?? null,
        localization: {
          slug: 'URL',
          slugPlaceholder: '',
        },
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
      list.push(twoFactorPlugin() as never);
    }

    return list;
  }, [activeOrgSlug, initialConfigStatus.magicLink, initialConfigStatus.twoFactor]);

  // Patch providerIcons for any generic OAuth provider that lacks a built-in icon,
  // so <ProviderButton> doesn't crash on "React.createElement: type is invalid".
  // Includes ssoOnly providers because they appear in Phase 2 of the sign-in form.
  // Run directly (not in useMemo) — this is an idempotent side effect, not a
  // computed value, and initialConfigStatus is stable for the lifetime of the app.
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
  }, [initialConfigStatus.socialProviders, initialConfigStatus.genericOAuthProviders]);

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
        {...(socialProviders && { socialProviders })}
        {...(initialConfigStatus.twoFactor && { twoFactor: ['totp'] as ['totp'] })}
        {...(initialConfigStatus.requireEmailVerification && {
          emailAndPassword: { requireEmailVerification: true },
        })}
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
    <QueryClientProvider client={getQueryClient()}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthProviderWrapper initialConfigStatus={initialConfigStatus} baseURL={baseURL}>
          {children}
        </AuthProviderWrapper>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
