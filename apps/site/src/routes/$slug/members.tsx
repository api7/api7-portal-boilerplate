import { useAuth, useAuthPlugin } from '@better-auth-ui/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Settings as SettingsIcon, User2 as UserIcon } from 'lucide-react';

import OrganizationInvitationsTable from '@/components/organization/OrganizationInvitationsTable';
import OrganizationMembersTable from '@/components/organization/OrganizationMembersTable';
import { DEFAULT_MEMBERS_PARAMS } from '@/components/organization/organization-members-shared';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { organizationPlugin } from '@/lib/auth/organization-plugin';
import {
  getMemberActionPermissions,
  listOrganizationInvitations,
  listOrganizationMembers,
} from '@/lib/dal/organization-members';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import { loadQuery } from '@/lib/query/load-query';
import {
  organizationInvitationsListKey,
  organizationMemberPermissionsKey,
  organizationMembersListKey,
} from '@/lib/query/keys';

export const Route = createFileRoute('/$slug/members')({
  loader: async ({ context: { queryClient }, params }) => {
    // `allSettled`: each part of the page also fetches itself with `useQuery`,
    // so one failing prefetch shouldn't take down the whole route.
    await Promise.allSettled([
      loadQuery(queryClient, {
        queryKey: organizationMembersListKey(
          params.slug,
          DEFAULT_MEMBERS_PARAMS,
        ),
        queryFn: () =>
          listOrganizationMembers({
            data: { organizationSlug: params.slug, ...DEFAULT_MEMBERS_PARAMS },
          }),
        staleTime: 30_000,
      }),
      loadQuery(queryClient, {
        queryKey: organizationMemberPermissionsKey(params.slug),
        queryFn: () =>
          getMemberActionPermissions({
            data: { organizationSlug: params.slug },
          }),
        staleTime: 30_000,
      }),
      loadQuery(queryClient, {
        queryKey: organizationInvitationsListKey(params.slug),
        queryFn: () =>
          listOrganizationInvitations({
            data: { organizationSlug: params.slug },
          }),
        staleTime: 30_000,
      }),
    ]);
  },
  component: OrganizationMembersPage,
});

function OrganizationMembersPage() {
  const slug = useOrganizationSlug();
  const navigate = useNavigate();
  const { localization } = useAuth();
  const { localization: organizationLocalization } =
    useAuthPlugin(organizationPlugin);

  return (
    <div className="flex flex-col gap-6 p-4">
      <Tabs value="people" className="w-full gap-4 md:gap-6">
        <TabsList aria-label={localization.settings.settings}>
          <TabsTrigger
            value="settings"
            className="gap-1"
            onClick={() =>
              navigate({ to: '/$slug/settings', params: { slug: slug! } })
            }
          >
            <SettingsIcon className="text-muted-foreground" />
            {localization.settings.settings}
          </TabsTrigger>

          <TabsTrigger value="people" className="gap-1">
            <UserIcon className="text-muted-foreground" />
            {organizationLocalization.people}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <OrganizationMembersTable />
      <OrganizationInvitationsTable />
    </div>
  );
}
