import { useQuery } from '@tanstack/react-query';

import { useParams } from '../hooks/useParams';
import { useSavePage } from '../hooks/useSavePage';
import { portalClient } from '../portal-sdk/client';
import type { SubscriptionStatus } from '@/types/portal-sdk';
import type { WithSavePage } from '@/types/utils';

type Params = {
  application_id?: string;
  subscription_status?: SubscriptionStatus;
} & TableParams;

type ProductListParams = WithSavePage<{
  initParams?: Params;
}>;

const useProductList = (p: ProductListParams = {}) => {
  const { savePage = false, initParams = {} } = p;
  const { paramsKeepNum, updateParams } = useParams<Params>(initParams);
  const { onParamsChange } = useSavePage<TableParams>({
    savePage,
    updateParams,
  });

  const goToPage = (page: number) =>
    onParamsChange({ page: page < 1 ? 1 : page });
  const { refetch, data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['products', paramsKeepNum],
    queryFn: () => portalClient.apiProduct.list(paramsKeepNum),
  });

  return {
    data: data?.list,
    options: data?.list?.map((v) => ({
      label: v.name,
      value: v.id,
    })),
    pagination: {
      total: data?.total || 0,
      page: paramsKeepNum.page!,
      pageSize: paramsKeepNum.page_size!,
      goToPage,
    },
    isLoading,
    isError,
    isValidating: isFetching,
    refetch,
    onParamsChange,
    params: paramsKeepNum,
  };
};

export default useProductList;
