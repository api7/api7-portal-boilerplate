import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import {
  listApiProducts,
  listApiProductsForOrganization,
} from '@/lib/dal/api-products';
import { productListKey } from '@/lib/query/keys';
import { LIST_STALE_TIME_MS } from '@/lib/query/stale-time';
import type { SubscriptionStatus } from '@/types/portal-sdk';

export type ProductListParams = {
  page: number;
  page_size: number;
  search?: string;
  subscription_status?: SubscriptionStatus;
};

export const productListQueryOptions = (
  orgSlug: string | null,
  params: ProductListParams,
) =>
  queryOptions({
    queryKey: productListKey(orgSlug, params),
    queryFn: () =>
      orgSlug
        ? listApiProductsForOrganization({
            data: { ...params, organizationSlug: orgSlug },
          })
        : listApiProducts({ data: params }),
    staleTime: LIST_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
