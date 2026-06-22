import { Users } from 'lucide-react';
import { redirect } from 'next/navigation';

import UserTable from '@/components/admin/UserTable';
import { SectionHeader } from '@/components/base/section-header';
import { PATH_ROOT } from '@/constants/path-prefix';
import { getCurrentPlatformAdminSession } from '@/lib/auth/platform-admin.server';

export default async function AdminUsersPage() {
  if (!(await getCurrentPlatformAdminSession())) redirect(PATH_ROOT);
  return (
    <div className="card-container">
      <SectionHeader
        title="Users"
        afterTitle={<Users className="h-5 w-5" />}
        desc="Manage platform users: update roles, view organizations, ban or delete users."
        className="mb-6"
      />
      <UserTable />
    </div>
  );
}
