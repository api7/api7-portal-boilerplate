'use client';

import { authClient } from '@/lib/auth/client';
import { UserButton } from '@daveyplate/better-auth-ui';
import { OrgSwitcher } from '@/components/organization/OrgSwitcher';

const UserMenu = () => {
  const req = authClient.useSession();

  return (
    <div className="flex items-center gap-2">
      {req.data?.user.id && <OrgSwitcher hidePersonal size="icon" />}
      <UserButton size="icon" />
    </div>
  );
};

export default UserMenu;
