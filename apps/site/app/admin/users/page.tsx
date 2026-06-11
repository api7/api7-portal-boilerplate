import { Users } from 'lucide-react';

import UserTable from '@/components/admin/UserTable';
import Header from '@/components/ui-legacy/header';

export default function AdminUsersPage() {
  return (
    <div className="card-container">
      <Header
        title="Users"
        afterTitle={<Users className="h-5 w-5" />}
        desc="Manage platform users: update roles, view organizations, ban or delete users."
        className="mb-6"
      />
      <UserTable />
    </div>
  );
}
