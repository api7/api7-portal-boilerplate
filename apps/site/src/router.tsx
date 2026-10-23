import { authQueryKeys } from '@better-auth-ui/core';
import { QueryClient } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

import { PageNotFound } from '@/components/slices/NotFound';
import { RouteError } from '@/components/slices/RouteError';
import { SESSION_STALE_TIME_MS } from '@/lib/query/stale-time';

import { routeTree } from './routeTree.gen';

export function getRouter() {
  const queryClient = new QueryClient();
  // Seeded auth data must not look stale on mount, or better-auth-ui would refetch it.
  // Not on `authQueryKeys.all`: better-auth-ui registers its retry options there,
  // and defaults for the same key replace each other.
  for (const queryKey of [authQueryKeys.session, authQueryKeys.users()]) {
    queryClient.setQueryDefaults(queryKey, { staleTime: SESSION_STALE_TIME_MS });
  }

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: PageNotFound,
    defaultErrorComponent: RouteError,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
