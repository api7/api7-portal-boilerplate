import ApplicationDetail from '@/components/applications/ApplicationDetail';

export default async function ApplicationDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { id } = await searchParams;
  return <ApplicationDetail id={id!} />;
}
