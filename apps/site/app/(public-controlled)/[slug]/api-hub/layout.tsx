import { auth } from '@/lib/auth/server';
import { verifySession, verifyOrganizationAccessBySlug } from '@/lib/dal/util';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PATH_API_HUB, PATH_ROOT } from '@/constants/path-prefix';

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
    redirect(`${PATH_ROOT}?error=no-access&slug=${encodeURIComponent(slug)}`);
  }

  if (session.session.activeOrganizationId !== org.id) {
    await auth.api.setActiveOrganization({
      body: { organizationId: org.id },
      headers: await headers(),
    });
  }

  return children;
}
