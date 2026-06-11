import { PATH_API_HUB } from '@/constants/path-prefix';
import { verifyOrganizationAccessBySlug, verifySession } from '@/lib/dal/util';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SlugApiHubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await verifySession({ redirect: false });

  if (!session?.user) {
    redirect(PATH_API_HUB);
  }

  const org = await verifyOrganizationAccessBySlug(slug);
  if (!org) {
    redirect(PATH_API_HUB);
  }

  return children;
}
