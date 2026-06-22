import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import MainLayout from '@/components/layouts/MainLayout';
import { verifySessionAndOrganization } from '@/lib/dal';
import { getQueryClient } from '@/lib/req';

export const dynamic = 'force-dynamic';

/**
 * Layout for public-controlled routes.
 *
 * When portal_public_access=true: Allow guest access (api-hub, home)
 * When portal_public_access=false: Require login for all pages
 *
 * Note: account/organization pages have additional checks that always require login
 */
export default async function PublicControlledLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySessionAndOrganization({ respectPublicAccess: true });

  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      <MainLayout>{children}</MainLayout>
    </HydrationBoundary>
  );
}
