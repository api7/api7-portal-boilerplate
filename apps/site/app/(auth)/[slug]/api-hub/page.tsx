import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { ListApiProductsData } from '@api7/portal-sdk/unstable-types';

import ApiHubPage from '@/components/api-hub/pages/ApiHubPage';
import type { FilterParamProps } from '@/components/api-hub/Filter';
import { DEFAULT_LIST_PARAMS } from '@/constants/common';
import { PATH_API_HUB, PATH_ROOT } from '@/constants/path-prefix';
import { MAX_PAGE_SIZE, parsePositiveInteger } from '@/lib/api/admin';
import { getPortalForOrganization } from '@/lib/dal/admin-organization';
import { verifyOrganizationAccessBySlug } from '@/lib/dal/util';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getString = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

const VALID_SUBSCRIPTION_STATUSES = new Set<FilterParamProps['subscription_status']>([
  'subscribed', 'wait_for_approval', 'unsubscribed',
]);

export default async function SlugApiHubPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const org = await verifyOrganizationAccessBySlug(slug);
  if (!org) redirect(PATH_ROOT);

  const p = (await searchParams) ?? {};
  const page = parsePositiveInteger(getString(p.page) ?? null, DEFAULT_LIST_PARAMS.page, 'page');
  const pageSize = Math.min(
    parsePositiveInteger(getString(p.page_size) ?? null, DEFAULT_LIST_PARAMS.page_size, 'page_size'),
    MAX_PAGE_SIZE,
  );
  const search = getString(p.search)?.trim() || undefined;
  const rawStatus = getString(p.subscription_status) as FilterParamProps['subscription_status'];
  const subscriptionStatus = VALID_SUBSCRIPTION_STATUSES.has(rawStatus) ? rawStatus : undefined;

  const query: ListApiProductsData['query'] = {
    page,
    page_size: pageSize,
    search,
    subscription_status: subscriptionStatus,
  };
  const result = await getPortalForOrganization(org.id).apiProduct.list(query)
    .catch(() => ({ list: [], total: 0 }));

  return (
    <Suspense>
      <ApiHubPage
        data={result.list ?? []}
        total={result.total ?? 0}
        page={page}
        pageSize={pageSize}
        search={search}
        subscriptionStatus={subscriptionStatus}
        basePath={`/${slug}${PATH_API_HUB}`}
      />
    </Suspense>
  );
}
