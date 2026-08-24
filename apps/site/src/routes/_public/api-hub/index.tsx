import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import ApiHubPage from '@/components/api-hub/pages/ApiHubPage';
import { DEFAULT_LIST_PARAMS, MAX_PAGE_SIZE } from '@/constants/common';
import { PATH_API_HUB } from '@/constants/path-prefix';
import { listApiProducts } from '@/lib/dal/api-products';

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

export const Route = createFileRoute('/_public/api-hub/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const result = await listApiProducts({ data: deps });
    const totalPages =
      result.total > 0 ? Math.ceil(result.total / deps.page_size) : 1;
    if (deps.page > totalPages) {
      throw redirect({
        to: '/api-hub',
        search: { ...deps, page: 1 },
      });
    }
    return result;
  },
  component: ApiHubList,
});

function ApiHubList() {
  const { list, total } = Route.useLoaderData();
  const { page, page_size, search, subscription_status } = Route.useSearch();

  return (
    <ApiHubPage
      data={list}
      total={total}
      page={page}
      pageSize={page_size}
      search={search}
      subscriptionStatus={subscription_status}
      basePath={PATH_API_HUB}
    />
  );
}
