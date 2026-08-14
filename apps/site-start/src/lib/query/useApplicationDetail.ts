import type { DeveloperApplication } from '@api7/portal-sdk/unstable-types';
import { useQuery } from '@tanstack/react-query';

import { getApplication } from '@/lib/dal/applications';
import { applicationDetailKey } from '@/lib/query/keys';
import { useOrganizationSlug } from '../hooks/useOrganizationSlug';

export type ApplicationFetcherParams = Pick<DeveloperApplication, 'id'>;

const useApplicationDetail = (params: ApplicationFetcherParams) => {
  const orgSlug = useOrganizationSlug();
  return useQuery({
    queryKey: applicationDetailKey(orgSlug, params.id),
    queryFn: () =>
      getApplication({
        data: { organizationSlug: orgSlug!, applicationId: params.id },
      }),
    enabled: !!params.id && !!orgSlug,
    retry: false,
  });
};

export type UseApplicationDetailReturn = ReturnType<
  typeof useApplicationDetail
>;

export default useApplicationDetail;
