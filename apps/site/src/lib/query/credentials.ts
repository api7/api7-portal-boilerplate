import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { DEFAULT_LIST_PARAMS } from '@/constants/common';
import { listCredentials } from '@/lib/dal/credentials';
import { LIST_STALE_TIME_MS } from '@/lib/query/stale-time';

type CredentialListData = Omit<
  Parameters<typeof listCredentials>[0]['data'],
  'organizationSlug'
>;

export const credentialListQueryOptions = (
  orgSlug: string,
  params: CredentialListData,
) =>
  queryOptions({
    queryKey: [
      'portal',
      'org',
      orgSlug,
      'application',
      params.application_id,
      'credentials',
      params,
    ],
    placeholderData: keepPreviousData,
    queryFn: () =>
      listCredentials({ data: { organizationSlug: orgSlug, ...params } }),
    staleTime: LIST_STALE_TIME_MS,
  });

// The params `KeyAuthTable` sends for its first page.
export const keyAuthFirstPageParams = (applicationId: string) => ({
  application_id: [applicationId],
  auth_method: 'key-auth' as const,
  page: String(DEFAULT_LIST_PARAMS.page),
  page_size: String(DEFAULT_LIST_PARAMS.page_size),
});
