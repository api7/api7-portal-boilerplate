import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { redirect } from 'next/navigation';

import ApplicationTable from '@/components/applications/ApplicationTable';
import { SectionHeader } from '@/components/base/section-header';
import { PATH_ROOT } from '@/constants/path-prefix';
import { getPortalForOrganization } from '@/lib/dal/admin-organization';
import { verifyOrganizationAccessBySlug } from '@/lib/dal/util';
import { applicationListKey } from '@/lib/query/keys';
import { getQueryClient } from '@/lib/req';

export default async function AuthApplicationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await verifyOrganizationAccessBySlug(slug);
  if (!org) redirect(PATH_ROOT);
  const queryClient = getQueryClient();
  await queryClient
    .prefetchQuery({
      queryKey: applicationListKey(slug, {}),
      queryFn: () => getPortalForOrganization(org.id).application.list({}),
    })
    .catch(() => {});
  return (
    <div className="card-container">
      <SectionHeader title="My Applications" className="mb-6" />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ApplicationTable />
      </HydrationBoundary>
    </div>
  );
}
