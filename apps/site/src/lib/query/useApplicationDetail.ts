import type { DeveloperApplication } from '@api7/portal-sdk/unstable-types';
import { useQuery } from '@tanstack/react-query';

import { applicationDetailQueryOptions } from '@/lib/query/applications';
import { useOrganizationSlug } from '../hooks/useOrganizationSlug';

export type ApplicationFetcherParams = Pick<DeveloperApplication, 'id'>;

const useApplicationDetail = (params: ApplicationFetcherParams) => {
  const orgSlug = useOrganizationSlug();
  return useQuery({
    ...applicationDetailQueryOptions(orgSlug!, params.id),
    enabled: !!params.id && !!orgSlug,
  });
};

export type UseApplicationDetailReturn = ReturnType<
  typeof useApplicationDetail
>;

export default useApplicationDetail;
