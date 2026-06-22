import { cache } from 'react';
import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: import('@tanstack/query-core').QueryClient;
  }
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Prevents SSR-hydrated queries from being immediately considered stale
        // and refetched on mount. Data fetched during RSC render is already fresh.
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

// Server: React cache() gives a per-request singleton so every caller within
// the same render (verifySession, layouts, etc.) shares one QueryClient.
// Browser: module-level singleton so HydrationBoundary injects into the same
// instance that QueryClientProvider provides.
const getServerQueryClient = cache(makeQueryClient);


export function getQueryClient() {
  if (typeof window === 'undefined') return getServerQueryClient();
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
    if (process.env.NODE_ENV === 'development') {
      window.__TANSTACK_QUERY_CLIENT__ = browserQueryClient;
    }
  }
  return browserQueryClient;
}

export const queryClient = getQueryClient();
export const req = axios.create();
