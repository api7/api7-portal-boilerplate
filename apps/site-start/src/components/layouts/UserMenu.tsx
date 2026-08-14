import { useAuth } from '@better-auth-ui/react';
import type { Organization } from 'better-auth/client';
import { LayoutDashboard } from 'lucide-react';
import { useLocation } from '@tanstack/react-router';

import { UserButton } from '@api7/portal-ui/components/auth/user/user-button';
import { OrganizationSwitcher } from '@api7/portal-ui/components/auth/organization/organization-switcher';
import { RESERVED_FIRST_SEGMENTS } from '@/constants/common';
import { PATH_DASHBOARD_USERS } from '@/constants/path-prefix';
import { ThemeToggle } from '@/components/layouts/ThemeToggle';

// Keeps the current tab when already on an org-scoped page.
function switchOrgHref(pathname: string, newSlug: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const isOrgScoped = !!segments[0] && !RESERVED_FIRST_SEGMENTS.has(segments[0]);
  const rest = isOrgScoped && segments.length > 1 ? segments.slice(1).join('/') : 'applications';
  return `/${newSlug}/${rest}`;
}

const UserMenu = ({ authorized, canAccessAdmin }: { authorized: boolean; canAccessAdmin: boolean }) => {
  const { pathname } = useLocation();
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
