import { useQuery } from '@tanstack/react-query';

import { useParams } from '../hooks/useParams';
import { useSavePage } from '../hooks/useSavePage';
import { approvalApi } from '@/lib/portal-sdk/approval';
import type { WithSavePage } from '@/types/utils';

type ApprovalListParams = WithSavePage<TableParams>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export const useApprovalList = (params: ApprovalListParams = {}) => {
  const { savePage = false, ...initParams } = params;
  const { paramsOnlyStr, paramsKeepNum, updateParams } = useParams(initParams);
  const { onParamsChange } = useSavePage<TableParams>({
    savePage,
    updateParams,
  });
  // The pagination control calls goToPage with a 0-based page index; the API
  // `page` param is 1-based, so convert.
  const goToPage = (pageIndex: number) =>
    onParamsChange({ page: pageIndex < 0 ? 1 : pageIndex + 1 });

  // Always send page/page_size — without page_size the Control Plane returns the
  // whole list (ignoring page), so the table would never paginate.
  const queryParams = {
    page: DEFAULT_PAGE,
    page_size: DEFAULT_PAGE_SIZE,
    ...paramsKeepNum,
  };

  const { refetch, data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['approvals', queryParams],
    queryFn: () => approvalApi.list(queryParams),
  });

  return {
    data: data?.list,
    pagination: {
      total: data?.total || 0,
      page: queryParams.page,
      pageSize: queryParams.page_size,
      pageIndex: queryParams.page - 1,
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

export default useApprovalList;
