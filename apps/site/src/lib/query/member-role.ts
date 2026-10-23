import { queryOptions } from '@tanstack/react-query';

import { getMemberRole } from '@/lib/dal/organization-members';
import { activeMemberRoleKey } from '@/lib/query/keys';
import { MEMBER_ROLE_STALE_TIME_MS } from '@/lib/query/stale-time';

export const memberRoleQueryOptions = (orgSlug: string) =>
  queryOptions({
    queryKey: activeMemberRoleKey(orgSlug),
    queryFn: () => getMemberRole({ data: { organizationSlug: orgSlug } }),
    staleTime: MEMBER_ROLE_STALE_TIME_MS,
  });
