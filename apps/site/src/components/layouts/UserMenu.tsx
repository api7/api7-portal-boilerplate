'use client';

import { useAuth } from '@better-auth-ui/react';
import type { Organization } from 'better-auth/client';
import { LayoutDashboard } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { UserButton } from '@/components/auth/user/user-button';
import { OrganizationSwitcher } from '@/components/auth/organization/organization-switcher';
import { PATH_DASHBOARD_USERS } from '@/constants/path-prefix';
import { ThemeToggle } from '@/components/layouts/ThemeToggle';

// Switching organizations from this menu preserves whatever tab the user is
// currently on (e.g. `/{slug}/api-hub`) instead of always landing on
// settings — swap only the slug segment of the current path.
function switchOrgHref(pathname: string, newSlug: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const rest = segments.length > 1 ? segments.slice(1).join('/') : 'applications';
  return `/${newSlug}/${rest}`;
}

const UserMenu = ({ authorized, canAccessAdmin }: { authorized: boolean; canAccessAdmin: boolean }) => {
  const pathname = usePathname();
  const { basePaths, navigate, viewPaths } = useAuth();

  const handleSetActive = (organization: Organization | null) => {
    navigate({
      to: organization?.slug
        ? switchOrgHref(pathname, organization.slug)
        : `${basePaths.settings}/${viewPaths.settings.account}`,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      {authorized && (
        <OrganizationSwitcher
          authorized
          hidePersonal
          size="icon"
          setActive={handleSetActive}
        />
      )}
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
