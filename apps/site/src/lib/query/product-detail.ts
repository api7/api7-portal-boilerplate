import { queryOptions } from '@tanstack/react-query';

import {
  getApiProduct,
  getApiProductForOrganization,
} from '@/lib/dal/api-products';
import { productDetailKey } from '@/lib/query/keys';
import { PRODUCT_DETAIL_STALE_TIME_MS } from '@/lib/query/stale-time';

export const productDetailQueryOptions = (
  orgSlug: string | null,
  id: string,
) =>
  queryOptions({
    queryKey: productDetailKey(orgSlug, id),
    queryFn: () =>
      orgSlug
        ? getApiProductForOrganization({
            data: { id, organizationSlug: orgSlug },
          })
        : getApiProduct({ data: id }),
    staleTime: PRODUCT_DETAIL_STALE_TIME_MS,
  });
