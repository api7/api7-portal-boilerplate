import { authQueryKeys } from '@better-auth-ui/core';
import { organizationQueryKeys } from '@better-auth-ui/core/plugins/organization';
import type { QueryClient } from '@tanstack/react-query';

import { getSessionAndOrganizations } from '@/lib/dal/session';
import { SESSION_KEY } from './keys';
import { SESSION_STALE_TIME_MS } from './stale-time';

// Besides the guards' own entry, fills the entries better-auth-ui's hooks read
// (`useSession`, `useListOrganizations`), so they don't fetch on mount.
const queryFn = async ({ client }: { client: QueryClient }) => {
  const { authSession, ...result } = await getSessionAndOrganizations({
    data: { respectPublicAccess: true },
  });
  client.setQueryData(authQueryKeys.session, authSession);
  if (authSession && result.orgs) {
    client.setQueryData(
      organizationQueryKeys.list(authSession.user.id),
      result.orgs,
    );
  }
  return result;
};

export const fetchSession = (queryClient: QueryClient) =>
  queryClient.fetchQuery({
    queryKey: SESSION_KEY,
    queryFn,
    staleTime: SESSION_STALE_TIME_MS,
  });

// Bypasses the cache, for when the cached session lacks something a navigation expects.
export const refetchSession = (queryClient: QueryClient) =>
  queryClient.fetchQuery({
    queryKey: SESSION_KEY,
    queryFn,
    staleTime: 0,
  });

// Never refetches while the cache is valid, for pages that only display the session and must not hit the network on navigation.
export const peekSession = (queryClient: QueryClient) =>
  queryClient.fetchQuery({
    queryKey: SESSION_KEY,
    queryFn,
    staleTime: Infinity,
  });

// Only marks the entries invalid, so a fetch already in flight isn't cancelled.
export const invalidateSession = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
  void queryClient.invalidateQueries({
    queryKey: SESSION_KEY,
    refetchType: 'none',
  });
  void queryClient.invalidateQueries({ queryKey: ['active-member-role'] });
};
