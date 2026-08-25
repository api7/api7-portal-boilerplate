import { useQuery } from '@tanstack/react-query';

import { getMemberActionPermissions } from '@/lib/dal/organization-members';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import { organizationMemberPermissionsKey } from '@/lib/query/keys';

// Matches the loader's prefetch params exactly so the initial `useQuery`
// call below hits the SSR-hydrated cache instead of fetching on mount.
export const DEFAULT_MEMBERS_PARAMS = {
  limit: 10,
  offset: 0,
  sortBy: 'createdAt',
  sortDirection: 'desc' as const,
};

// Server-rendered so the actions column isn't blank until per-row permission
// checks round-trip; shared with the invitations table.
export function useMemberActionPermissions() {
  const orgSlug = useOrganizationSlug();
  return useQuery({
    queryKey: organizationMemberPermissionsKey(orgSlug),
    queryFn: () =>
      getMemberActionPermissions({ data: { organizationSlug: orgSlug! } }),
    enabled: !!orgSlug,
    staleTime: 30_000,
  });
}
