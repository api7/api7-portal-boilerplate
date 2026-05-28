import MainLayout from '@/components/layouts/MainLayout';
import { PATH_ROOT } from '@/constants/path-prefix';
import { verifySession, verifyOrganizationAccessBySlug } from '@/lib/dal/util';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await verifySession({ redirect: true });

  if (!session?.user) {
    redirect(PATH_ROOT);
  }

  const org = await verifyOrganizationAccessBySlug(slug);
  if (!org) {
    redirect(`${PATH_ROOT}?error=no-access&slug=${encodeURIComponent(slug)}`);
  }

  return <MainLayout>{children}</MainLayout>;
}
