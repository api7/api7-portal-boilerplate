import { createFileRoute } from '@tanstack/react-router';
import { Users } from 'lucide-react';

import UserTable from '@/components/admin/UserTable';
import { SectionHeader } from '@/components/base/section-header';

export const Route = createFileRoute('/admin/users')({
  component: AdminUsersPage,
});

function AdminUsersPage() {
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
