import { createFileRoute, useRouter } from '@tanstack/react-router';
import { z } from 'zod';

import ApprovalTable from '@/components/admin/approvals/ApprovalTable';
import { SectionHeader } from '@/components/base/section-header';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/constants/common';
import { listApprovals } from '@/lib/dal/admin-approvals';

const searchSchema = z.object({
  page: z.coerce.number().int().positive().catch(DEFAULT_PAGE),
  page_size: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE)
    .catch(DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
  order_by: z.enum(['applied_at', 'resource_name', 'operated_at']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

export const Route = createFileRoute('/admin/approvals')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => listApprovals({ data: deps }),
  component: AdminApprovalsPage,
});

function AdminApprovalsPage() {
  const { list, total } = Route.useLoaderData();
  const { page, page_size } = Route.useSearch();
  const router = useRouter();

  return (
    <div className="card-container">
      <SectionHeader
        title="Approvals"
        desc="Review and process subscription and registration requests."
        className="mb-6"
      />
      <ApprovalTable
        data={list}
        total={total}
        page={page}
        pageSize={page_size}
        refetch={() => router.invalidate()}
      />
    </div>
  );
}
