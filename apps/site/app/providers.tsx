'use client';

import { AuthUIProvider } from '@daveyplate/better-auth-ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import {
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { authClient } from '@/lib/auth/client';
import { useActiveOrganizationSlug } from '@/lib/hooks/useActiveOrganizationSlug';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import { queryClient } from '@/lib/req';
import { configStatusQueryOptions } from '@/apis/query-option';
import enUS from 'antd/locale/en_US';
import { CircleHelpIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@daveyplate/better-auth-ui';

const authLocalization = {
  ORGANIZATIONS_INSTRUCTIONS:
    'Create an organization to collaborate with other members',
  ORGANIZATION_SLUG: 'URL',
  ORGANIZATION_SLUG_PLACEHOLDER: '',
  ORGANIZATION_SLUG_DESCRIPTION: `This is your organization's URL namespace on developer portal. Within it, your team members can inspect their applications, or configure settings to their liking.`,
};

function AuthUIProviderWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: configStatus } = useQuery(configStatusQueryOptions);
  const domainPrefix =
    typeof window === 'undefined' ? '' : `${window.location.host}/`;
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

    // Only redirect when the current URL actually starts with the old slug.
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname;
    if (currentPath.startsWith(`/${prevSlug}/`)) {
      const newPath = currentPath.replace(`/${prevSlug}/`, `/${activeOrgSlug}/`);
      router.replace(newPath + window.location.search);
    }
  }, [activeOrgSlug, router]);

  // Track the last known activeOrganizationId so we can restore it
  // after re-sign-in (where better-auth resets it to null).
  // For multi-org users this prevents silently switching to a different org.
  const prevOrgIdRef = useRef<string | null>(null);
  const session = authClient.useSession();
  const activeOrgId = session.data?.session?.activeOrganizationId;
  useEffect(() => {
    if (activeOrgId) {
      prevOrgIdRef.current = activeOrgId;
    }
  }, [activeOrgId]);

  // After re-sign-in, better-auth creates a fresh session without
  // activeOrganizationId. The tanstack layer refetches the session and
  // caches this null value before our server-side fix can run. Fix it
  // client-side: detect the missing org, set it, then refetch so the
  // TanStack cache is correct before any navigation happens.
  const handleSessionChange = useCallback(async () => {
    try {
      const { data: currentSession } = await authClient.getSession();
      if (
        currentSession?.user &&
        !currentSession.session?.activeOrganizationId
      ) {
        const { data: orgs } = await authClient.organization.list();
        if (orgs && orgs.length > 0) {
          const preferred = prevOrgIdRef.current;
          const targetOrg =
            (preferred && orgs.find((o) => o.id === preferred)) || orgs[0];
          await authClient.organization.setActive({
            organizationId: targetOrg.id,
          });
          await qc.refetchQueries({ queryKey: ['session'] });
        }
      }
    } finally {
      router.refresh();
    }
  }, [router, qc]);

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={handleSessionChange}
      Link={Link as never}
      localization={authLocalization}
      organization={{
        basePath: activeOrgSlug
          ? `/${activeOrgSlug}/organization`
          : '/organization',
        slugField: {
          prefix: domainPrefix,
          labelInfo: (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground">
                  <CircleHelpIcon className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-wrap">
                {authLocalization.ORGANIZATION_SLUG_DESCRIPTION}
              </TooltipContent>
            </Tooltip>
          ),
        },
      }}
      account
      // need config it first in auth/server.ts and auth/client.ts
      // ref: https://www.better-auth.com/docs/plugins/magic-link
      magicLink={configStatus?.magicLink}
      // need config it first in config.yaml or auth/server.ts
      // ref: https://www.better-auth.com/docs/reference/options#socialproviders
      {...(configStatus?.socialProviders?.length && {
        social: {
          providers: configStatus.socialProviders,
        },
      })}
      // need config it first in auth/server.ts
      // ref: https://www.better-auth.com/docs/plugins/generic-oauth
      {...(configStatus?.genericOAuthProviders?.length && {
        genericOAuth: {
          providers: configStatus.genericOAuthProviders,
        },
      })}
      {...(configStatus?.twoFactor && {
        twoFactor: ['totp'],
      })}
    >
      {children}
    </AuthUIProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthUIProviderWrapper>
        <AntdRegistry layer>
          <ConfigProvider
            locale={enUS}
            theme={{
              token: {
                colorPrimary: '#000000',
              },
            }}
          >
            {children}
          </ConfigProvider>
        </AntdRegistry>
      </AuthUIProviderWrapper>
    </QueryClientProvider>
  );
}
