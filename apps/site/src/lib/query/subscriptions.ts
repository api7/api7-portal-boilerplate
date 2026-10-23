import { queryOptions } from '@tanstack/react-query';

import { listSubscriptions } from '@/lib/dal/subscriptions';
import { subscriptionListKey } from '@/lib/query/keys';
import { LIST_STALE_TIME_MS } from '@/lib/query/stale-time';

type SubscriptionListData = Omit<
  Parameters<typeof listSubscriptions>[0]['data'],
  'organizationSlug'
>;

export const subscriptionListQueryOptions = (
  orgSlug: string,
  params: SubscriptionListData,
) =>
  queryOptions({
    queryKey: subscriptionListKey(orgSlug, params),
    queryFn: () =>
      listSubscriptions({ data: { organizationSlug: orgSlug, ...params } }),
    staleTime: LIST_STALE_TIME_MS,
  });
