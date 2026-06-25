import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import MainLayout from '@/components/layouts/MainLayout';
import { verifySession } from '@/lib/dal/util';
import { getQueryClient } from '@/lib/req';

export const dynamic = 'force-dynamic';

export default async function SessionOnlyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession({ redirect: true });

  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      <MainLayout>{children}</MainLayout>
    </HydrationBoundary>
  );
}
