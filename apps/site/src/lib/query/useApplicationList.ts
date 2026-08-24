import { useQuery } from '@tanstack/react-query';

import { listApplications } from '@/lib/dal/applications';
import { applicationListKey } from '@/lib/query/keys';
import type { WithSavePage } from '@/types/utils';
import { useOrganizationSlug } from '../hooks/useOrganizationSlug';
import { useParams } from '../hooks/useParams';
import { useSavePage } from '../hooks/useSavePage';

type ApplicationListParams = WithSavePage<TableParams>;

export const useApplicationList = (params: ApplicationListParams = {}) => {
  const orgSlug = useOrganizationSlug();
  const { savePage = false, ...initParams } = params;
  const { paramsKeepNum, updateParams } = useParams(initParams);
  const { onParamsChange } = useSavePage<TableParams>({
    savePage,
    updateParams,
  });
  const goToPage = (page: number) =>
    onParamsChange({ page: page < 1 ? 1 : page });
  const { refetch, data, isLoading, isFetching, isError } = useQuery({
    queryKey: applicationListKey(orgSlug, paramsKeepNum),
    queryFn: () =>
      listApplications({
        data: { organizationSlug: orgSlug!, ...paramsKeepNum },
      }),
    enabled: !!orgSlug,
  });

  return {
    data: data?.list,
    pagination: {
      total: data?.total || 0,
      page: paramsKeepNum.page || 1,
      pageSize: paramsKeepNum.page_size || 10,
      pageIndex: (paramsKeepNum.page || 1) - 1,
      goToPage,
    },
    isLoading,
    isError,
    isValidating: isFetching,
    refetch,
    onParamsChange,
  };
};

export default useApplicationList;
