import { useQuery } from '@tanstack/react-query';

import { listApiProductsForOrganization } from '@/lib/dal/api-products';
import { productListKey } from '@/lib/query/keys';
import type { SubscriptionStatus } from '@/types/portal-sdk';
import type { WithSavePage } from '@/types/utils';
import { useOrganizationSlug } from '../hooks/useOrganizationSlug';
import { useParams } from '../hooks/useParams';
import { useSavePage } from '../hooks/useSavePage';

type Params = {
  application_id?: string;
  subscription_status?: SubscriptionStatus;
} & TableParams;

type ProductListParams = WithSavePage<{
  initParams?: Params;
}>;

const useProductList = (p: ProductListParams = {}) => {
  const orgSlug = useOrganizationSlug();
  const { savePage = false, initParams = {} } = p;
  const { paramsKeepNum, updateParams } = useParams<Params>(initParams);
  const { onParamsChange } = useSavePage<TableParams>({
    savePage,
    updateParams,
  });

  const goToPage = (page: number) =>
    onParamsChange({ page: page < 1 ? 1 : page });
  const queryKey = productListKey(orgSlug, paramsKeepNum);
  const { refetch, data, isLoading, isFetching, isError } = useQuery({
    queryKey,
    queryFn: () =>
      listApiProductsForOrganization({
        data: {
          organizationSlug: orgSlug!,
          page: paramsKeepNum.page,
          page_size: paramsKeepNum.page_size,
          search: paramsKeepNum.search,
          subscription_status: paramsKeepNum.subscription_status,
          application_id: paramsKeepNum.application_id,
        },
      }),
    enabled: !!orgSlug,
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
  };
};

export default useProductList;
