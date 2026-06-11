import { Building2 } from 'lucide-react';

import OrganizationTable from '@/components/admin/OrganizationTable';
import Header from '@/components/ui-legacy/header';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parsePositiveInteger,
} from '@/lib/api/admin';
import { listAdminOrganizations } from '@/lib/dal/admin-organization';

export const dynamic = 'force-dynamic';

type AdminOrganizationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getStringParam = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export default async function AdminOrganizationsPage({
  searchParams,
}: AdminOrganizationsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  let page = DEFAULT_PAGE;
  let pageSize = DEFAULT_PAGE_SIZE;
  try {
    page = parsePositiveInteger(
      getStringParam(resolvedSearchParams.page) ?? null,
      DEFAULT_PAGE,
      'page',
    );
    pageSize = Math.min(
      parsePositiveInteger(
        getStringParam(resolvedSearchParams.page_size) ?? null,
        DEFAULT_PAGE_SIZE,
        'page_size',
      ),
      MAX_PAGE_SIZE,
    );
  } catch {
    page = DEFAULT_PAGE;
    pageSize = DEFAULT_PAGE_SIZE;
  }
  const search =
    getStringParam(resolvedSearchParams.search)?.trim() || undefined;
  const userId =
    getStringParam(resolvedSearchParams.user_id)?.trim() || undefined;

  const result = await listAdminOrganizations({
    page,
    pageSize,
    search,
    userId,
    orderBy: 'created_at',
    direction: 'desc',
  });

  return (
    <div className="card-container">
      <Header
        title="Organizations"
        afterTitle={<Building2 className="h-5 w-5" />}
        desc="Inspect organizations and enter impersonation mode as the organization owner."
        className="mb-6"
      />
      <OrganizationTable
        data={result.list}
        total={result.total}
        page={page}
        pageSize={pageSize}
        search={search}
      />
    </div>
  );
}
