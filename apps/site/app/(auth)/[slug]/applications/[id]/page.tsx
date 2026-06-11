import ApplicationDetail from '@/components/applications/ApplicationDetail';

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;
  return <ApplicationDetail id={id} />;
}
