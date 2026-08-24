import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import type { ReactNode } from 'react';

import { Providers } from '@/components/providers';
import { Toaster } from '@api7/portal-ui/components/ui/sonner';
import { getConfigStatus } from '@/lib/config/config-status';

import appCss from '../globals.css?url';
import { getConfig } from '../lib/config';

interface RouterContext {
  queryClient: QueryClient;
}

const getAppMeta = createServerFn({ method: 'GET' }).handler(async () => {
  const { app } = getConfig();
  return {
    name: app.name,
    desc: app.desc,
    baseURL: app.baseURL,
    signUpConsentLabel: app.signUpConsentLabel,
    showApiHub: app.apiHub?.enabled !== false,
    configStatus: getConfigStatus(),
  };
});

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: () => getAppMeta(),
  head: ({ loaderData }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: loaderData?.name ?? 'Developer Portal' },
      { name: 'description', content: loaderData?.desc },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { baseURL, configStatus } = Route.useLoaderData();
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <Providers initialConfigStatus={configStatus} baseURL={baseURL ?? ''}>
          <Toaster position="top-right" closeButton expand richColors />
          <Outlet />
        </Providers>
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
