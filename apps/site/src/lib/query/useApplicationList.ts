import { useQuery } from '@tanstack/react-query';

import { applicationListQueryOptions } from '@/lib/query/applications';
import type { WithSavePage } from '@/types/utils';
import { useOrganizationSlug } from '../hooks/useOrganizationSlug';
import { useParams } from '../hooks/useParams';
import { useSavePage } from '../hooks/useSavePage';

type ApplicationListParams = WithSavePage<TableParams> & {
  enabled?: boolean;
};

export const useApplicationList = (params: ApplicationListParams = {}) => {
  const orgSlug = useOrganizationSlug();
  const { savePage = false, enabled = true, ...initParams } = params;
  const { paramsKeepNum, updateParams } = useParams(initParams);
  const { onParamsChange } = useSavePage<TableParams>({
    savePage,
    updateParams,
  });
  const goToPage = (page: number) =>
    onParamsChange({ page: page < 1 ? 1 : page });
  const { refetch, data, isLoading, isFetching, isError } = useQuery({
    ...applicationListQueryOptions(orgSlug!, paramsKeepNum),
    enabled: enabled && !!orgSlug,
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
