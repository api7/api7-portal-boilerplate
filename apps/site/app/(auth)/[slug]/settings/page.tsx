import { redirect } from 'next/navigation';

import { Organization } from '@/components/auth/organization/organization';
import { PATH_ROOT } from '@/constants/path-prefix';
import { verifyOrganizationAccessBySlug } from '@/lib/dal/util';

export default async function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await verifyOrganizationAccessBySlug(slug))) redirect(PATH_ROOT);
  return (
    <main className="container p-4 md:p-6">
      <Organization path="settings" />
    </main>
  );
}
