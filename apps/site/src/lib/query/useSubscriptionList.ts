import type { ListSubscriptionsData } from '@api7/portal-sdk/unstable-types';
import { useQuery } from '@tanstack/react-query';

import { subscriptionListQueryOptions } from '@/lib/query/subscriptions';
import type { WithSavePage } from '@/types/utils';
import { useOrganizationSlug } from '../hooks/useOrganizationSlug';
import { useParams } from '../hooks/useParams';
import { useSavePage } from '../hooks/useSavePage';

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
  const orgSlug = useOrganizationSlug();

  const goToPage = (page: number) =>
    onParamsChange({ page: page < 1 ? 1 : page });

  const { refetch, data, isLoading, isFetching, isError } = useQuery({
    ...subscriptionListQueryOptions(orgSlug!, paramsOnlyStr),
    enabled: enabled !== false && !!orgSlug,
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
  };
};

export default useSubscriptionList;
