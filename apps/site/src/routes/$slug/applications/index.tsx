import { createFileRoute } from '@tanstack/react-router';

import ApplicationTable from '@/components/applications/ApplicationTable';
import { SectionHeader } from '@/components/base/section-header';
import { applicationListQueryOptions } from '@/lib/query/applications';
import { loadQuery } from '@/lib/query/load-query';

export const Route = createFileRoute('/$slug/applications/')({
  loader: async ({ params, context }) => {
    await Promise.allSettled([
      loadQuery(context.queryClient, applicationListQueryOptions(params.slug)),
    ]);
  },
  component: ApplicationsPage,
});

function ApplicationsPage() {
  return (
    <div className="card-container">
      <SectionHeader title="My Applications" className="mb-6" />
      <ApplicationTable />
    </div>
  );
}
