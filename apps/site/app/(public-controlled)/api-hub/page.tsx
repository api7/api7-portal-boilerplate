import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import ApiHubPage from '@/components/api-hub/pages/ApiHubPage';
import { DEFAULT_LIST_PARAMS } from '@/constants/common';
import { portal } from '@/lib/portal-sdk/server';
import { productListKey } from '@/lib/query/keys';
import { getQueryClient } from '@/lib/req';

export default async function Page() {
  const queryClient = getQueryClient();
  await queryClient
    .prefetchQuery({
      queryKey: productListKey(null, DEFAULT_LIST_PARAMS),
      queryFn: () => portal.apiProduct.list(DEFAULT_LIST_PARAMS),
    })
    .catch(() => {});
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ApiHubPage />
    </HydrationBoundary>
  );
}
