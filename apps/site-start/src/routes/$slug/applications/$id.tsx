import { createFileRoute } from '@tanstack/react-router';

import ApplicationDetail from '@/components/applications/ApplicationDetail';

export const Route = createFileRoute('/$slug/applications/$id')({
  component: ApplicationDetailPage,
});

function ApplicationDetailPage() {
  const { id } = Route.useParams();
  return <ApplicationDetail id={id} />;
}
