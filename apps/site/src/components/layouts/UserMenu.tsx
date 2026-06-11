'use client';

import { LayoutDashboard } from 'lucide-react';

import { UserButton } from '@/components/auth/user/user-button';
import { OrganizationSwitcher } from '@/components/auth/organization/organization-switcher';
import { PATH_DASHBOARD_USERS } from '@/constants/path-prefix';
import { ThemeToggle } from '@/components/layouts/ThemeToggle';

const UserMenu = ({ authorized, canAccessAdmin }: { authorized: boolean; canAccessAdmin: boolean }) => {
  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      {authorized && <OrganizationSwitcher authorized hidePersonal size="icon" />}
      <UserButton
        size="icon"
        links={
          canAccessAdmin
            ? [
                {
                  label: 'Admin',
                  href: PATH_DASHBOARD_USERS,
                  icon: <LayoutDashboard className="text-muted-foreground" />,
                  visibility: 'authenticated',
                },
              ]
            : []
        }
      />
    </div>
  );
};

export default UserMenu;
