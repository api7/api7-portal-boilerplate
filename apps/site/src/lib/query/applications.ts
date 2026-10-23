import { queryOptions } from '@tanstack/react-query';

import { getApplication, listApplications } from '@/lib/dal/applications';
import { applicationDetailKey, applicationListKey } from '@/lib/query/keys';
import { LIST_STALE_TIME_MS } from '@/lib/query/stale-time';

export const applicationListQueryOptions = (
  orgSlug: string,
  params: { page?: number; page_size?: number } = {},
) =>
  queryOptions({
    queryKey: applicationListKey(orgSlug, params),
    queryFn: () =>
      listApplications({ data: { organizationSlug: orgSlug, ...params } }),
    staleTime: LIST_STALE_TIME_MS,
  });

export const applicationDetailQueryOptions = (orgSlug: string, id: string) =>
  queryOptions({
    queryKey: applicationDetailKey(orgSlug, id),
    queryFn: () =>
      getApplication({ data: { organizationSlug: orgSlug, applicationId: id } }),
    staleTime: LIST_STALE_TIME_MS,
    retry: false,
  });
