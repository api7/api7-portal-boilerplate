import { useQuery } from '@tanstack/react-query';

import { listDCRProviders } from '@/lib/dal/dcr-providers';
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
  fetchAll?: boolean;
}>;

const useDCRProviderList = (p: ProductListParams = {}) => {
  const { savePage = false, initParams = {}, fetchAll = false } = p;
  const orgSlug = useOrganizationSlug();
  const { paramsKeepNum, updateParams, paramsHash } = useParams<Params>(
    fetchAll
      ? { ...initParams, page: undefined, page_size: undefined }
      : initParams,
  );
  const { onParamsChange } = useSavePage<TableParams>({
    savePage,
    updateParams,
  });

  const goToPage = (page: number) =>
    onParamsChange({ page: page < 1 ? 1 : page });
  const { refetch, data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['portal', 'dcr-providers', orgSlug, paramsHash],
    queryFn: () =>
      listDCRProviders({
        data: { organizationSlug: orgSlug!, ...paramsKeepNum },
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

export default useDCRProviderList;
