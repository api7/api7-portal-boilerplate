import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { verifySessionAndOrganization } from '@/lib/dal';
import { getQueryClient } from '@/lib/req';

export const dynamic = 'force-dynamic';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySessionAndOrganization();

  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      {children}
    </HydrationBoundary>
  );
}
