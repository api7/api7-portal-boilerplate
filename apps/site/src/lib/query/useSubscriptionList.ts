import { useQuery } from '@tanstack/react-query';

import { useParams } from '../hooks/useParams';
import { useSavePage } from '../hooks/useSavePage';
import { portalClient } from '../portal-sdk/client';
import type { WithSavePage } from '@/types/utils';
import { authClient } from '../auth/client';
import { ListSubscriptionsData } from '@api7/portal-sdk/unstable-types';

type SubscriptionListParams = NonNullable<ListSubscriptionsData['query']>;
export type UseSubscriptionListParams = WithSavePage<
  Partial<SubscriptionListParams>
> & {
  enabled?: boolean;
};

export type UseSubscriptionListReturnType = ReturnType<
  typeof useSubscriptionList
>;

export const useSubscriptionList = (params: UseSubscriptionListParams = {}) => {
  const { savePage = false, enabled, ...initParams } = params;
  const { paramsOnlyStr, paramsKeepNum, updateParams } = useParams(initParams);
  const { onParamsChange } = useSavePage<SubscriptionListParams>({
    savePage,
    updateParams,
  });
  const session = authClient.useSession();

  const goToPage = (page: number) =>
    onParamsChange({ page: page < 1 ? 1 : page });

  const { refetch, data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['subscriptions', paramsOnlyStr],
    queryFn: () => portalClient.subscription.list(paramsOnlyStr),
    enabled: enabled !== false && !!session.data?.session?.activeOrganizationId,
  });

  return {
    data: data?.list,
    total: data?.total || 0,
    pagination: {
      total: data?.total || 0,
      page: paramsKeepNum.page as number,
      pageIndex: (paramsKeepNum.page || 1) - 1,
      pageSize: paramsKeepNum.page_size as number,
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

export default useSubscriptionList;
