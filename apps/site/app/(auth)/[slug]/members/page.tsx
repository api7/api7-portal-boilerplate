import { Organization } from '@api7/portal-ui/components/auth/organization/organization';
import { redirect } from 'next/navigation';

import { PATH_ROOT } from '@/constants/path-prefix';
import { verifyOrganizationAccessBySlug } from '@/lib/dal/util';

export default async function OrganizationMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await verifyOrganizationAccessBySlug(slug))) redirect(PATH_ROOT);
  return (
    <main className="container p-4 md:p-6">
      {/* Styles the vendored Organization tables via their stable data-slot
          attributes instead of editing the registry components directly. */}
      <div
        className="
          [&_[data-slot=card]]:rounded-md
          [&_[data-slot=table-header]_[data-slot=table-row]]:bg-muted/50
          [&_[data-slot=table-head]]:text-xs
          [&_[data-slot=table-head]]:font-medium
          [&_[data-slot=table-head]]:text-muted-foreground
        "
      >
        <Organization path="members" />
      </div>
    </main>
  );
}
