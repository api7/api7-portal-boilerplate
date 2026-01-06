import { useQuery } from '@tanstack/react-query';

import { useParams } from '../hooks/useParams';
import { useSavePage } from '../hooks/useSavePage';
import { portalClient } from '@/lib/portal-sdk/client';
import type { WithSavePage } from '@/types/utils';

type ApplicationListParams = WithSavePage<TableParams>;

export const useApplicationList = (params: ApplicationListParams = {}) => {
  const { savePage = false, ...initParams } = params;
  const { paramsOnlyStr, paramsKeepNum, updateParams } = useParams(initParams);
  const { onParamsChange } = useSavePage<TableParams>({
    savePage,
    updateParams,
  });
  const goToPage = (page: number) =>
    onParamsChange({ page: page < 1 ? 1 : page });
  const { refetch, data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['applications', paramsKeepNum],
    queryFn: () => portalClient.application.list(paramsKeepNum),
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
    params: paramsOnlyStr,
  };
};

export default useApplicationList;

