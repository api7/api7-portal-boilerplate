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
import {
  organizationInvitationsListKey,
  organizationMemberPermissionsKey,
  organizationMembersListKey,
} from '@/lib/query/keys';

export const Route = createFileRoute('/$slug/members')({
  loader: async ({ context: { queryClient }, params }) => {
    // `allSettled`, not `all` — these three are independent prefetches for
    // separate parts of the page; one failing (a transient permission-check
    // error, say) shouldn't take down the whole route when each one's
    // client-side `useQuery` can just fetch it instead.
    await Promise.allSettled([
      queryClient.ensureQueryData({
        queryKey: organizationMembersListKey(
          params.slug,
          DEFAULT_MEMBERS_PARAMS,
        ),
        queryFn: () =>
          listOrganizationMembers({
            data: { organizationSlug: params.slug, ...DEFAULT_MEMBERS_PARAMS },
          }),
      }),
      queryClient.ensureQueryData({
        queryKey: organizationMemberPermissionsKey(params.slug),
        queryFn: () =>
          getMemberActionPermissions({
            data: { organizationSlug: params.slug },
          }),
      }),
      queryClient.ensureQueryData({
        queryKey: organizationInvitationsListKey(params.slug),
        queryFn: () =>
          listOrganizationInvitations({
            data: { organizationSlug: params.slug },
          }),
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
    <main className="container p-4 md:p-6 flex flex-col gap-6">
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
    </main>
  );
}
