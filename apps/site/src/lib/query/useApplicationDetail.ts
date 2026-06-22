import { useQuery } from '@tanstack/react-query';
import type { DeveloperApplication } from '@api7/portal-sdk/unstable-types';

import { useOrganizationSlug } from '../hooks/useOrganizationSlug';
import { portalClient } from '@/lib/portal-sdk/client';
import { applicationDetailKey } from '@/lib/query/keys';

export type ApplicationFetcherParams = Pick<DeveloperApplication, 'id'>;

const useApplicationDetail = (params: ApplicationFetcherParams) => {
  const orgSlug = useOrganizationSlug();
  const { data, refetch, isFetching, isLoading, isError, status } = useQuery({
    queryKey: applicationDetailKey(orgSlug, params.id),
    queryFn: () => portalClient.application.get(params.id),
    enabled: !!params.id,
    retry: false,
  });

  return {
    isLoading,
    isValidating: isFetching,
    refetch,
    data,
    isError,
    status,
  };
};

export type UseApplicationDetailReturn = ReturnType<
  typeof useApplicationDetail
>;

export default useApplicationDetail;
