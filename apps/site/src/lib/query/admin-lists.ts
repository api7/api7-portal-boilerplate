import { queryOptions } from '@tanstack/react-query';

import { listApprovals } from '@/lib/dal/admin-approvals';
import { listAdminOrganizations } from '@/lib/dal/admin-organizations';
import { adminApprovalsKey, adminOrganizationsKey } from '@/lib/query/keys';
import { LIST_STALE_TIME_MS } from '@/lib/query/stale-time';

type ApprovalsParams = Parameters<typeof listApprovals>[0]['data'];
type OrganizationsParams = Omit<
  Parameters<typeof listAdminOrganizations>[0]['data'],
  'direction'
>;

export const approvalsQueryOptions = (params: ApprovalsParams) =>
  queryOptions({
    queryKey: adminApprovalsKey(params),
    queryFn: () => listApprovals({ data: params }),
    staleTime: LIST_STALE_TIME_MS,
  });

export const adminOrganizationsQueryOptions = (params: OrganizationsParams) =>
  queryOptions({
    queryKey: adminOrganizationsKey(params),
    queryFn: () =>
      listAdminOrganizations({ data: { ...params, direction: 'desc' } }),
    staleTime: LIST_STALE_TIME_MS,
  });
