'use client';

import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/components/auth/auth-provider';
import { organizationPlugin } from '@/lib/auth/organization-plugin';
import type { ConfigStatus } from '@/lib/config/config-status';
import { ConfigStatusProvider } from '@/lib/config/config-status-context';
import { authClient } from '@/lib/auth/client';
import { useActiveOrganizationSlug } from '@/lib/hooks/useActiveOrganizationSlug';
import { queryClient } from '@/lib/req';
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
}: {
  children: ReactNode;
  initialConfigStatus: ConfigStatus;
}) {
  const router = useRouter();
  const activeOrgSlug = useActiveOrganizationSlug();

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

  const navigate = useCallback(
    ({ to, replace }: { to: string; replace?: boolean }) => {
      if (replace) router.replace(to);
      else router.push(to);
    },
    [router],
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
        Link={Link as never}
        basePaths={{ auth: '/auth', settings: '/account', organization: '' }}
        viewPaths={{ settings: { account: 'settings', security: 'security' } }}
        plugins={plugins}
        {...(socialProviders && { socialProviders })}
        {...(initialConfigStatus.twoFactor && { twoFactor: ['totp'] as ['totp'] })}
      >
        {children}
      </AuthProvider>
    </ConfigStatusProvider>
  );
}

export function Providers({
  children,
  initialConfigStatus,
}: {
  children: ReactNode;
  initialConfigStatus: ConfigStatus;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthProviderWrapper initialConfigStatus={initialConfigStatus}>{children}</AuthProviderWrapper>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
