import { createFileRoute } from '@tanstack/react-router';
import { Building2 } from 'lucide-react';
import { z } from 'zod';

import OrganizationTable from '@/components/admin/OrganizationTable';
import { SectionHeader } from '@/components/base/section-header';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/constants/common';
import { listAdminOrganizations } from '@/lib/dal/admin-organizations';

const searchSchema = z.object({
  page: z.coerce.number().int().positive().catch(DEFAULT_PAGE),
  page_size: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE)
    .catch(DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
  user_id: z.string().optional(),
});

export const Route = createFileRoute('/admin/organizations')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) =>
    listAdminOrganizations({ data: { ...deps, direction: 'desc' } }),
  component: AdminOrganizationsPage,
});

function AdminOrganizationsPage() {
  const result = Route.useLoaderData();
  const { page, page_size, search } = Route.useSearch();

  return (
    <div className="card-container">
      <SectionHeader
        title="Organizations"
        afterTitle={<Building2 className="h-5 w-5" />}
        desc="Inspect organizations and enter impersonation mode as the organization owner."
        className="mb-6"
      />
      <OrganizationTable
        data={result.list}
        total={result.total}
        page={page}
        pageSize={page_size}
        search={search}
      />
    </div>
  );
}
