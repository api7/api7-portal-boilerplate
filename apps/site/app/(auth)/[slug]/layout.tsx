import { redirect } from 'next/navigation';

import MainLayout from '@/components/layouts/MainLayout';
import { PATH_ROOT } from '@/constants/path-prefix';
import { verifyOrganizationAccessBySlug, verifySession } from '@/lib/dal/util';

export const dynamic = 'force-dynamic';

export default async function SlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await verifyOrganizationAccessBySlug(slug);
  if (!org) {
    await verifySession({ redirect: true });
    redirect(`${PATH_ROOT}?error=no-access&slug=${encodeURIComponent(slug)}`);
  }

  return <MainLayout>{children}</MainLayout>;
}
