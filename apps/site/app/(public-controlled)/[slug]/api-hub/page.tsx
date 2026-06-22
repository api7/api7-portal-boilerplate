import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { redirect } from 'next/navigation';

import ApiHubPage from '@/components/api-hub/pages/ApiHubPage';
import { DEFAULT_LIST_PARAMS } from '@/constants/common';
import { PATH_API_HUB } from '@/constants/path-prefix';
import { verifyOrganizationAccessBySlug } from '@/lib/dal/util';
import { portal } from '@/lib/portal-sdk/server';
import { productListKey } from '@/lib/query/keys';
import { getQueryClient } from '@/lib/req';

export default async function SlugApiHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await verifyOrganizationAccessBySlug(slug))) redirect(PATH_API_HUB);
  const queryClient = getQueryClient();
  await queryClient
    .prefetchQuery({
      queryKey: productListKey(slug, DEFAULT_LIST_PARAMS),
      queryFn: () => portal.apiProduct.list(DEFAULT_LIST_PARAMS),
    })
    .catch(() => {});
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ApiHubPage />
    </HydrationBoundary>
  );
}
