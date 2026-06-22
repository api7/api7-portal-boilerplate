import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { redirect } from 'next/navigation';

import ApplicationDetail from '@/components/applications/ApplicationDetail';
import { PATH_ROOT } from '@/constants/path-prefix';
import { getPortalForOrganization } from '@/lib/dal/admin-organization';
import { verifyOrganizationAccessBySlug } from '@/lib/dal/util';
import { applicationDetailKey, subscriptionListKey } from '@/lib/query/keys';
import { getQueryClient } from '@/lib/req';

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const org = await verifyOrganizationAccessBySlug(slug);
  if (!org) redirect(PATH_ROOT);
  const queryClient = getQueryClient();
  const portalForOrg = getPortalForOrganization(org.id);
  await Promise.all([
    queryClient
      .prefetchQuery({
        queryKey: applicationDetailKey(slug, id),
        queryFn: () => portalForOrg.application.get(id),
      })
      .catch(() => {}),
    queryClient
      .prefetchQuery({
        queryKey: subscriptionListKey(slug, { application_id: id }),
        queryFn: () => portalForOrg.subscription.list({ application_id: id }),
      })
      .catch(() => {}),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ApplicationDetail id={id} />
    </HydrationBoundary>
  );
}
