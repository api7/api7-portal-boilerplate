import { redirect } from 'next/navigation';
import type { ListApprovalsData } from '@api7/portal-sdk/unstable-types';

import ApprovalTable from '@/components/admin/approvals/ApprovalTable';
import { SectionHeader } from '@/components/base/section-header';
import { PATH_ROOT } from '@/constants/path-prefix';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, parsePositiveInteger } from '@/lib/api/admin';
import { loadOrgNames } from '@/lib/approvals/enrich.server';
import { getCurrentPlatformAdminSession } from '@/lib/auth/platform-admin.server';
import { portal } from '@/lib/portal-sdk/server';
import type { Approval } from '@/lib/portal-sdk/approval';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getString = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export default async function AdminApprovalsPage({ searchParams }: Props) {
  if (!(await getCurrentPlatformAdminSession())) redirect(PATH_ROOT);

  const resolved = (await searchParams) ?? {};
  let page = DEFAULT_PAGE;
  let pageSize = DEFAULT_PAGE_SIZE;
  try {
    page = parsePositiveInteger(getString(resolved.page) ?? null, DEFAULT_PAGE, 'page');
    pageSize = Math.min(
      parsePositiveInteger(getString(resolved.page_size) ?? null, DEFAULT_PAGE_SIZE, 'page_size'),
      MAX_PAGE_SIZE,
    );
  } catch {
    page = DEFAULT_PAGE;
    pageSize = DEFAULT_PAGE_SIZE;
  }
  const search = getString(resolved.search)?.trim() || undefined;
  const rawOrderBy = getString(resolved.order_by);
  const orderBy = (['applied_at', 'resource_name', 'operated_at'] as const).find(
    (v) => v === rawOrderBy,
  );
  const rawDirection = getString(resolved.direction);
  const direction = rawDirection === 'asc' || rawDirection === 'desc' ? rawDirection : undefined;

  const query: ListApprovalsData['query'] = {
    page,
    page_size: pageSize,
    ...(search ? { search } : {}),
    ...(orderBy ? { order_by: orderBy } : {}),
    ...(direction ? { direction } : {}),
  };

  const body = await portal.approval.list(query);
  const list = body.list ?? [];
  const orgNames = await loadOrgNames(list.map((a) => a.applicant_name ?? '').filter(Boolean));
  const enriched: Approval[] = list.map((a) => ({
    ...(a as unknown as Approval),
    applicant_org_name: a.applicant_name ? orgNames[a.applicant_name] : undefined,
  }));

  return (
    <div className="card-container">
      <SectionHeader
        title="Approvals"
        desc="Review and process subscription and registration requests."
        className="mb-6"
      />
      <ApprovalTable
        data={enriched}
        total={body.total ?? enriched.length}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
