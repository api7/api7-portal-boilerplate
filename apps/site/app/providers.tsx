'use client';

import { AuthUIProvider } from '@daveyplate/better-auth-ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';

import { authClient } from '@/lib/auth/client';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import { queryClient } from '@/lib/req';
import { configStatusQueryOptions } from '@/apis/query-option';
import enUS from 'antd/locale/en_US';

function AuthUIProviderWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: configStatus } = useQuery(configStatusQueryOptions);

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      Link={Link as never}
      organization
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
