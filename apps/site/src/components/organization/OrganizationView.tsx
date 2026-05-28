'use client';

import { MenuIcon } from 'lucide-react';
import { useContext, useEffect, useMemo } from 'react';
import { useAuthenticate } from '@daveyplate/better-auth-ui';
import { useCurrentOrganization } from '@daveyplate/better-auth-ui';
import { AuthUIContext } from '@daveyplate/better-auth-ui';
import { cn } from '@/lib/utils';
import type { OrganizationViewPath } from '@daveyplate/better-auth-ui/server';
import { ApiKeysCard } from '@daveyplate/better-auth-ui';
import { Button } from '@/components/ui/button';
import {
  OrganizationInvitationsCard,
  OrganizationMembersCard,
  OrganizationSettingsCards,
  TeamsCard,
} from '@daveyplate/better-auth-ui';

export type OrganizationViewPageProps = {
  className?: string;
  classNames?: Record<string, any>;
  localization?: Record<string, string>;
  path?: string;
  pathname?: string;
  view?: OrganizationViewPath;
  hideNav?: boolean;
  slug?: string;
};

/**
 * Local copy of better-auth-ui's OrganizationView.
 *
 * Change from original: nav links no longer append `/{slug}` in pathMode="slug"
 * because our basePath already includes the org slug (e.g. /{slug}/organization).
 */
export function OrganizationView({
  className,
  classNames,
  localization: localizationProp,
  path: pathProp,
  pathname,
  view: viewProp,
  hideNav,
  slug: slugProp,
}: OrganizationViewPageProps) {
  const {
    teams: teamOptions,
    organization: organizationOptions,
    localization: contextLocalization,
    account: accountOptions,
    Link,
    replace,
  } = useContext(AuthUIContext);

  const { slug: contextSlug, viewPaths, apiKey } = organizationOptions || {};
  const { enabled: teamsEnabled } = teamOptions || {};

  useAuthenticate();

  const localization = useMemo(
    () => ({ ...contextLocalization, ...localizationProp }),
    [contextLocalization, localizationProp],
  );

  const path = pathProp ?? pathname?.split('/').pop();

  // Map URL path segments to view keys. viewPaths values include the
  // "organization/" prefix (e.g. "organization/settings") but URL path
  // params only have the trailing segment (e.g. "settings"), so we match
  // by the last segment of each viewPath value.
  const matchedView = useMemo(() => {
    if (viewProp) return viewProp;
    if (!path || !viewPaths) return null;
    for (const [key, value] of Object.entries(viewPaths)) {
      const lastSegment = (value as string).split('/').pop();
      if (lastSegment === path) return key as OrganizationViewPath;
    }
    return null;
  }, [viewProp, path, viewPaths]);

  const view = matchedView || 'SETTINGS';

  const slug = slugProp || contextSlug;

  const {
    data: organization,
    isPending: organizationPending,
    isRefetching: organizationRefetching,
  } = useCurrentOrganization({ slug });

  const navItems: {
    view: OrganizationViewPath;
    label: string;
  }[] = [
    { view: 'SETTINGS', label: localization.SETTINGS },
    { view: 'MEMBERS', label: localization.MEMBERS },
  ];

  if (teamsEnabled) {
    navItems.push({
      view: 'TEAMS',
      label: localization.TEAMS,
    });
  }

  if (apiKey) {
    navItems.push({
      view: 'API_KEYS',
      label: localization.API_KEYS,
    });
  }

  useEffect(() => {
    if (organization || organizationPending || organizationRefetching) return;

    replace(
      `${accountOptions?.basePath}/${accountOptions?.viewPaths?.ORGANIZATIONS}`,
    );
  }, [
    organization,
    organizationPending,
    organizationRefetching,
    accountOptions?.basePath,
    accountOptions?.viewPaths?.ORGANIZATIONS,
    replace,
  ]);

  const basePath = organizationOptions?.basePath ?? '/organization';

  return (
    <div
      className={cn(
        'flex w-full grow flex-col gap-4 md:flex-row md:gap-12',
        className,
        classNames?.base,
      )}
    >
      {!hideNav && (
        <div className="flex justify-between gap-2 md:hidden">
          <span className="font-semibold text-base">
            {navItems.find((i) => i.view === view)?.label}
          </span>

          {/* Mobile drawer nav — omitted for simplicity; keep desktop sidebar */}
        </div>
      )}

      {!hideNav && (
        <div className="hidden md:block">
          <div
            className={cn(
              'flex w-48 flex-col gap-1 lg:w-60',
              classNames?.sidebar?.base,
            )}
          >
            {navItems.map((item) => (
              <Link
                key={item.view}
                href={`${basePath}/${organizationOptions?.viewPaths[item.view]}`}
              >
                <Button
                  size="lg"
                  className={cn(
                    'w-full justify-start px-4 transition-none',
                    classNames?.sidebar?.button,
                    view === item.view
                      ? 'font-semibold'
                      : 'text-foreground/70',
                    view === item.view && classNames?.sidebar?.buttonActive,
                  )}
                  variant="ghost"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {view === 'MEMBERS' && (
        <div
          className={cn(
            'flex w-full flex-col gap-4 md:gap-6',
            className,
            classNames?.cards,
          )}
        >
          <OrganizationMembersCard
            classNames={classNames?.card}
            localization={localization}
            slug={slug}
          />

          <OrganizationInvitationsCard
            classNames={classNames?.card}
            localization={localization}
            slug={slug}
          />
        </div>
      )}

      {view === 'TEAMS' && organization?.id && teamsEnabled && (
        <TeamsCard
          classNames={classNames}
          localization={localization}
          organizationId={organization.id}
        />
      )}

      {view === 'API_KEYS' && (
        <ApiKeysCard
          classNames={classNames?.card}
          localization={localization}
          isPending={organizationPending}
          organizationId={organization?.id}
        />
      )}

      {view === 'SETTINGS' && (
        <OrganizationSettingsCards
          classNames={classNames}
          localization={localization}
          slug={slug}
        />
      )}
    </div>
  );
}
