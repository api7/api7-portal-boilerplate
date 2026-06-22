import { notFound, redirect } from 'next/navigation';

import { PATH_API_HUB } from '@/constants/path-prefix';
import { getConfig } from '@/lib/config';
import { verifyOrganizationAccessBySlug } from '@/lib/dal/util';

export const dynamic = 'force-dynamic';

export default async function SlugApiHubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { app } = getConfig();
  if (app.apiHub?.enabled === false) notFound();
  const { slug } = await params;
  if (!(await verifyOrganizationAccessBySlug(slug))) redirect(PATH_API_HUB);
  return <>{children}</>;
}
