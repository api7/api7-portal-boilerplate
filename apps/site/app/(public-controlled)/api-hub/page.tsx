import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { ListApiProductsData } from '@api7/portal-sdk/unstable-types';

import ApiHubPage from '@/components/api-hub/pages/ApiHubPage';
import type { FilterParamProps } from '@/components/api-hub/Filter';
import { PATH_API_HUB } from '@/constants/path-prefix';
import { DEFAULT_LIST_PARAMS } from '@/constants/common';
import { MAX_PAGE_SIZE, parsePositiveInteger } from '@/lib/api/admin';
import { portal } from '@/lib/portal-sdk/server';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getString = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

const VALID_SUBSCRIPTION_STATUSES = new Set<FilterParamProps['subscription_status']>([
  'subscribed', 'wait_for_approval', 'unsubscribed',
]);

export default async function ApiHubListPage({ searchParams }: Props) {
  const p = (await searchParams) ?? {};
  const page = parsePositiveInteger(getString(p.page) ?? null, DEFAULT_LIST_PARAMS.page, 'page');
  const pageSize = Math.min(
    parsePositiveInteger(getString(p.page_size) ?? null, DEFAULT_LIST_PARAMS.page_size, 'page_size'),
    MAX_PAGE_SIZE,
  );
  const search = getString(p.search)?.trim() || undefined;
  const rawStatus = getString(p.subscription_status) as FilterParamProps['subscription_status'];
  const subscriptionStatus = VALID_SUBSCRIPTION_STATUSES.has(rawStatus) ? rawStatus : undefined;

  const query: ListApiProductsData['query'] = { page, page_size: pageSize, search, subscription_status: subscriptionStatus };
  const result = await portal.apiProduct.list(query).catch(() => ({ list: [], total: 0 }));

  const totalPages = result.total > 0 ? Math.ceil(result.total / pageSize) : 1;
  if (page > totalPages) {
    const params = new URLSearchParams({ page: '1', page_size: String(pageSize) });
    if (search) params.set('search', search);
    if (subscriptionStatus) params.set('subscription_status', subscriptionStatus);
    redirect(`${PATH_API_HUB}?${params.toString()}`);
  }

  return (
    <Suspense>
      <ApiHubPage
        data={result.list ?? []}
        total={result.total ?? 0}
        page={page}
        pageSize={pageSize}
        search={search}
        subscriptionStatus={subscriptionStatus}
        basePath={PATH_API_HUB}
      />
    </Suspense>
  );
}
