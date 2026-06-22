import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import MainLayout from '@/components/layouts/MainLayout';
import { verifySession } from '@/lib/dal/util';
import { getQueryClient } from '@/lib/req';

export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession({ redirect: false });

  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      <MainLayout>{children}</MainLayout>
    </HydrationBoundary>
  );
}
