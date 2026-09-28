import type { OrganizationAuthClient } from '@better-auth-ui/core/plugins/organization';
import { useAuth } from '@better-auth-ui/react';
import { useActiveOrganization } from '@better-auth-ui/react/plugins/organization';
import type { Organization } from 'better-auth/client';
import { LayoutDashboard } from 'lucide-react';
import { useLocation } from '@tanstack/react-router';

import { UserButton } from '@/components/auth/user/user-button';
import { OrganizationLogo } from '@/components/auth/organization/organization-logo';
import { OrganizationSwitcher } from '@/components/auth/organization/organization-switcher';
import { buttonVariants } from '@/components/ui/button';
import { DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RESERVED_FIRST_SEGMENTS } from '@/constants/common';
import { PATH_DASHBOARD_USERS } from '@/constants/path-prefix';
import { ThemeToggle } from '@/components/layouts/ThemeToggle';
import { cn } from '@/lib/utils';

// Keeps the current tab when already on an org-scoped page.
function switchOrgHref(pathname: string, newSlug: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const isOrgScoped = !!segments[0] && !RESERVED_FIRST_SEGMENTS.has(segments[0]);
  const rest = isOrgScoped && segments.length > 1 ? segments.slice(1).join('/') : 'applications';
  return `/${newSlug}/${rest}`;
}

const UserMenu = ({ authorized, canAccessAdmin }: { authorized: boolean; canAccessAdmin: boolean }) => {
  const { pathname } = useLocation();
  const { authClient, basePaths, navigate, viewPaths } = useAuth<OrganizationAuthClient>();
  const { data: activeOrganization, isPending: activeOrganizationPending } =
    useActiveOrganization(authClient);

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
          hidePersonal
          setActive={handleSetActive}
          trigger={
            <DropdownMenuTrigger
              data-testid="org-switcher"
              aria-label="Open organization switcher"
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-fit rounded-md')}
              disabled={activeOrganizationPending}
            >
              {/* Square corners set an organization apart from a person's round avatar. */}
              <OrganizationLogo
                key={activeOrganization?.logo}
                isPending={activeOrganizationPending}
                organization={activeOrganization ?? undefined}
                className="rounded-md after:rounded-md [&_[data-slot=avatar-image]]:rounded-md [&_[data-slot=avatar-fallback]]:rounded-md"
              />
            </DropdownMenuTrigger>
          }
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
