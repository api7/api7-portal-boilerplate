'use client';

import { usePathname } from 'next/navigation';
import {
  ChevronsUpDown,
  LogInIcon,
  PlusCircleIcon,
  SettingsIcon,
} from 'lucide-react';
import {
  type ComponentType,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

import { AuthUIContext } from '@daveyplate/better-auth-ui';
import {
  OrganizationCellView,
  OrganizationLogo,
  UserAvatar,
} from '@daveyplate/better-auth-ui';
type User = { isAnonymous?: boolean | null };
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import { PersonalAccountView } from './PersonalAccountView';

/**
 * Adapted from better-auth-ui's OrganizationSwitcher.
 *
 * Differences from the original:
 * - Always uses pathMode="slug" — navigates by URL, never calls setActiveOrganization.
 * - No activeOrganizationPending state (no async org switching).
 * - No hidePersonal auto-select logic (org is determined by URL slug).
 * - No onSetActive callback.
 */
export function OrgSwitcher({
  className,
  hidePersonal,
  hideCreate,
  createOrganizationDialog,
  trigger,
  size,
}: {
  className?: string;
  hidePersonal?: boolean;
  hideCreate?: boolean;
  createOrganizationDialog?: ComponentType<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }>;
  trigger?: ReactNode;
  size?: 'icon';
}) {
  const {
    hooks: { useSession, useListOrganizations },
    organization: organizationOptions,
    account: accountOptions,
    redirectTo,
    Link,
  } = useContext(AuthUIContext);

  const pathname = usePathname();
  const personalPath = organizationOptions?.personalPath;
  const { data: sessionData, isPending: sessionPending } = useSession();
  const user = sessionData?.user;

  const { data: organizations, isPending: organizationsPending } =
    useListOrganizations();

  // Read current org from URL slug (injected via organization.slug in providers.tsx).
  const contextSlug = organizationOptions?.slug;

  // Find the active org from the organization list by slug.
  const activeOrganization = useMemo(() => {
    if (!contextSlug || !organizations) return undefined;
    return organizations.find((org) => org.slug === contextSlug);
  }, [contextSlug, organizations]);

  /**
   * Build the href for switching to another organization.
   * When already on an org-scoped page, preserve the current sub-path.
   * When on a global page, default to /{slug}/applications.
   */
  const switchOrgHref = (slug: string) => {
    if (contextSlug) {
      const segments = pathname.split('/').filter(Boolean);
      const rest = segments.length > 1 ? segments.slice(1).join('/') : 'applications';
      return `/${slug}/${rest}`;
    }
    return `/${slug}/applications`;
  };

  const isPending = organizationsPending || sessionPending;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCreateOrgDialogOpen, setIsCreateOrgDialogOpen] = useState(false);

  const CreateOrganizationDialogOverride = createOrganizationDialog;

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          {trigger ||
            (size === 'icon' ? (
              <Button
                size="icon"
                className={cn('size-fit rounded-full', className)}
                variant="ghost"
                type="button"
              >
                {isPending ||
                activeOrganization ||
                !sessionData ||
                (user as User)?.isAnonymous ||
                hidePersonal ? (
                  <OrganizationLogo
                    key={activeOrganization?.logo}
                    isPending={isPending}
                    organization={activeOrganization}
                  />
                ) : (
                  <UserAvatar
                    key={user?.image}
                    user={user}
                  />
                )}
              </Button>
            ) : (
              <Button className={cn('p-2! h-fit', className)} type="button">
                {isPending ||
                activeOrganization ||
                !sessionData ||
                (user as User)?.isAnonymous ||
                hidePersonal ? (
                  <OrganizationCellView
                    isPending={isPending}
                    organization={activeOrganization}
                  />
                ) : (
                  <PersonalAccountView user={user} />
                )}
                <ChevronsUpDown className="ml-auto" />
              </Button>
            ))}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width] min-w-56 max-w-64"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header: current org/personal + settings link */}
          <div className="flex items-center justify-between gap-2 p-2">
            {(user && !(user as User).isAnonymous) || isPending ? (
              <>
                {activeOrganization || hidePersonal ? (
                  <OrganizationCellView
                    isPending={isPending}
                    organization={activeOrganization}
                  />
                ) : (
                  <PersonalAccountView isPending={isPending} user={user} />
                )}

                {!isPending && (
                  <Link
                    href={
                      activeOrganization
                        ? `/${activeOrganization.slug}/${organizationOptions?.viewPaths.SETTINGS}`
                        : `${accountOptions?.basePath}/${accountOptions?.viewPaths.SETTINGS}`
                    }
                  >
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-8! ml-auto"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <SettingsIcon className="size-4" />
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <div className="-my-1 text-muted-foreground text-xs">
                Organization
              </div>
            )}
          </div>

          <DropdownMenuSeparator />

          {/* Personal account row (when hidePersonal is false) */}
          {activeOrganization && !hidePersonal && (
            <DropdownMenuItem asChild>
              <Link href={personalPath ?? redirectTo}>
                <PersonalAccountView isPending={isPending} user={user} />
              </Link>
            </DropdownMenuItem>
          )}

          {/* Organization list */}
          {organizations?.map(
            (organization) =>
              organization.id !== activeOrganization?.id && (
                <DropdownMenuItem key={organization.id} asChild>
                  <Link href={switchOrgHref(organization.slug!)}>
                    <OrganizationCellView
                      isPending={isPending}
                      organization={organization}
                    />
                  </Link>
                </DropdownMenuItem>
              ),
          )}

          {organizations &&
            organizations.length > 0 &&
            (!hidePersonal || organizations.length > 1) && (
              <DropdownMenuSeparator />
            )}

          {/* Create org / Sign in */}
          {!isPending && sessionData && !(user as User).isAnonymous ? (
            hideCreate ? null : (
              <DropdownMenuItem
                onClick={() => setIsCreateOrgDialogOpen(true)}
              >
                <PlusCircleIcon />
                Create Organization
              </DropdownMenuItem>
            )
          ) : (
            <DropdownMenuItem asChild>
              <Link href="/auth/sign-in">
                <LogInIcon />
                Sign In
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {CreateOrganizationDialogOverride ? (
        <CreateOrganizationDialogOverride
          open={isCreateOrgDialogOpen}
          onOpenChange={setIsCreateOrgDialogOpen}
        />
      ) : (
        <CreateOrganizationModal
          open={isCreateOrgDialogOpen}
          onOpenChange={setIsCreateOrgDialogOpen}
        />
      )}
    </>
  );
}
