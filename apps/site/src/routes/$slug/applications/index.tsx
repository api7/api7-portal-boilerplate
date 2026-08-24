import { createFileRoute } from '@tanstack/react-router';

import ApplicationTable from '@/components/applications/ApplicationTable';
import { SectionHeader } from '@/components/base/section-header';

export const Route = createFileRoute('/$slug/applications/')({
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
