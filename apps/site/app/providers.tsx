'use client';

import { AuthUIProvider } from '@daveyplate/better-auth-ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import {
  QueryClientProvider,
  useQuery,
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

  const handleSessionChange = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={handleSessionChange}
      Link={Link as never}
      localization={authLocalization}
      organization={{
        pathMode: 'slug',
        slug: activeOrgSlug ?? undefined,
        basePath: activeOrgSlug ? `/${activeOrgSlug}` : '',
        viewPaths: {
          SETTINGS: 'organization/settings',
          MEMBERS: 'organization/members',
          TEAMS: 'organization/teams',
          API_KEYS: 'organization/api-keys',
        },
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
