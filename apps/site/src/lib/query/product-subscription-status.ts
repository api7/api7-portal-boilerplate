import { queryOptions, useQuery } from '@tanstack/react-query';

import { getProductSubscriptionStatus } from '@/lib/dal/subscriptions';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import { productSubscriptionStatusKey } from '@/lib/query/keys';
import { LIST_STALE_TIME_MS } from '@/lib/query/stale-time';

export const productSubscriptionStatusQueryOptions = (
  orgSlug: string,
  productId: string,
) =>
  queryOptions({
    queryKey: productSubscriptionStatusKey(orgSlug, productId),
    queryFn: () =>
      getProductSubscriptionStatus({
        data: { organizationSlug: orgSlug, productId },
      }),
    staleTime: LIST_STALE_TIME_MS,
  });

// Subscribed and pending-approval subscriptions of one product, in one request.
export const useProductSubscriptionStatus = (
  productId: string,
  enabled = true,
) => {
  const orgSlug = useOrganizationSlug();
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...productSubscriptionStatusQueryOptions(orgSlug!, productId),
    enabled: enabled && !!orgSlug,
  });

  return {
    subscribed: data?.subscribed.list,
    subscribedTotal: data?.subscribed.total ?? 0,
    waiting: data?.waiting.list,
    waitingTotal: data?.waiting.total ?? 0,
    isLoading,
    isFetching,
    // Only set when there is no data to fall back on.
    isError: isError && !data,
    refetch,
  };
};
