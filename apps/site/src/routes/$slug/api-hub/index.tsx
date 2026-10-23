import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import ApiHubPage from '@/components/api-hub/pages/ApiHubPage';
import { DEFAULT_LIST_PARAMS, MAX_PAGE_SIZE } from '@/constants/common';
import { PATH_API_HUB } from '@/constants/path-prefix';
import { loadQuery } from '@/lib/query/load-query';
import { productListQueryOptions } from '@/lib/query/product-list';

const searchSchema = z.object({
  page: z.coerce.number().int().positive().catch(DEFAULT_LIST_PARAMS.page),
  page_size: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE)
    .catch(DEFAULT_LIST_PARAMS.page_size),
  search: z.string().optional(),
  subscription_status: z
    .enum(['subscribed', 'wait_for_approval', 'unsubscribed'])
    .optional(),
});

export const Route = createFileRoute('/$slug/api-hub/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps, params, context }) => {
    const options = productListQueryOptions(params.slug, deps);
    await loadQuery(context.queryClient, options);
  },
  component: ApiHubList,
});

function ApiHubList() {
  const deps = Route.useLoaderDeps();
  const { page, page_size, search, subscription_status } = Route.useSearch();
  const { slug } = Route.useParams();
  const { data, isLoading, isError, isFetching, refetch } = useQuery(
    productListQueryOptions(slug, deps),
  );

  return (
    <ApiHubPage
      data={data?.list}
      total={data?.total}
      isLoading={isLoading}
      isError={isError}
      isFetching={isFetching}
      onReload={() => void refetch()}
      page={page}
      pageSize={page_size}
      search={search}
      subscriptionStatus={subscription_status}
      basePath={`/${slug}${PATH_API_HUB}`}
    />
  );
}
