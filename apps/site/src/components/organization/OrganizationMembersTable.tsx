'use client';

import { InviteMemberDialog } from '@api7/portal-ui/components/auth/organization/invite-member-dialog';
import { LeaveOrganizationDialog } from '@api7/portal-ui/components/auth/organization/leave-organization-dialog';
import { RemoveMemberDialog } from '@api7/portal-ui/components/auth/organization/remove-member-dialog';
import { UserView } from '@api7/portal-ui/components/auth/user/user-view';
import { Button, buttonVariants } from '@api7/portal-ui/components/ui/button';
import { ButtonGroup } from '@api7/portal-ui/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@api7/portal-ui/components/ui/dropdown-menu';
import { Spinner } from '@api7/portal-ui/components/ui/spinner';
import { organizationPlugin } from '@api7/portal-ui/lib/auth/organization-plugin';
import { cn } from '@api7/portal-ui/lib/utils';
import type {
  OrganizationAuthClient,
  OrganizationLocalization,
} from '@better-auth-ui/core/plugins/organization';
import { useAuth, useAuthPlugin } from '@better-auth-ui/react';
import {
  useActiveOrganization,
  useUpdateMemberRole,
} from '@better-auth-ui/react/plugins/organization';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Member, Organization, User } from 'better-auth/client';
import { EllipsisVerticalIcon, Filter, LogOut, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  DataTable,
  type DataTableColumnDef,
} from '@/components/base/data-table';
import { SectionHeader } from '@/components/base/section-header';
import {
  getMemberActionPermissions,
  listOrganizationMembers,
} from '@/lib/dal/organization-members';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import {
  organizationInvitationsListKey,
  organizationMemberPermissionsKey,
  organizationMembersListKey,
} from '@/lib/query/keys';

type MemberRow = Member & { user: Partial<User> };

type MemberListParams = {
  order_by?: string;
  direction?: 'asc' | 'desc';
  page_size?: number;
  search?: string;
};

function MemberActionsCell({
  member,
  isOwner,
  isCurrentUser,
  organization,
  organizationLocalization,
  roles,
  hasUpdatePermission,
  hasDeletePermission,
  updateMemberRole,
  isUpdatingRole,
  onMemberListChange,
}: {
  member: MemberRow;
  isOwner?: boolean;
  isCurrentUser: boolean;
  organization: Organization | undefined;
  organizationLocalization: OrganizationLocalization;
  roles: Record<string, string>;
  hasUpdatePermission?: boolean;
  hasDeletePermission?: boolean;
  updateMemberRole: (params: { memberId: string; role: string }) => void;
  isUpdatingRole: boolean;
  onMemberListChange: () => void;
}) {
  const assignableRoles = Object.entries(roles).filter(
    ([key]) => isOwner || key !== 'owner',
  );

  const [removeOpen, setRemoveOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const canLeaveOrRemove = isCurrentUser || hasDeletePermission;

  return (
    <div className="flex items-center justify-end">
      <ButtonGroup aria-label="Member actions">
        {hasUpdatePermission && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  disabled={isUpdatingRole}
                  aria-label={organizationLocalization.changeMemberRole}
                >
                  {isUpdatingRole && <Spinner />}
                  Edit
                </Button>
              }
            />

            <DropdownMenuContent align="end">
              {assignableRoles.map(([role, label]) => (
                <DropdownMenuItem
                  key={role}
                  disabled={member.role === role}
                  onClick={() =>
                    updateMemberRole({ memberId: member.id, role })
                  }
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {canLeaveOrRemove && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="More Options">
                  <EllipsisVerticalIcon />
                </Button>
              }
            />

            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                {isCurrentUser ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setLeaveOpen(true)}
                  >
                    <LogOut />
                    {organizationLocalization.leaveOrganization}
                  </DropdownMenuItem>
                ) : (
                  hasDeletePermission && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setRemoveOpen(true)}
                    >
                      <Trash2 />
                      {organizationLocalization.removeMember}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </ButtonGroup>

      {isCurrentUser
        ? // `organization` is a client-only fetch and may not have resolved yet.
          organization && (
            <LeaveOrganizationDialog
              open={leaveOpen}
              onOpenChange={(next) => {
                setLeaveOpen(next);
                if (!next) onMemberListChange();
              }}
              organization={organization}
            />
          )
        : hasDeletePermission && (
            <RemoveMemberDialog
              open={removeOpen}
              onOpenChange={(next) => {
                setRemoveOpen(next);
                if (!next) onMemberListChange();
              }}
              member={member}
            />
          )}
    </div>
  );
}

// Matches the loader's prefetch params exactly so the initial `useQuery`
// call below hits the SSR-hydrated cache instead of fetching on mount.
export const DEFAULT_MEMBERS_PARAMS = {
  limit: 10,
  offset: 0,
  sortBy: 'createdAt',
  sortDirection: 'desc' as const,
};

// Comfortably above better-auth's own 100-member default.
const MEMBER_SEARCH_LIMIT = 1000;

// Server-rendered so the actions column isn't blank until per-row permission
// checks round-trip; shared with the invitations table.
export function useMemberActionPermissions() {
  const orgSlug = useOrganizationSlug();
  return useQuery({
    queryKey: organizationMemberPermissionsKey(orgSlug),
    queryFn: () =>
      getMemberActionPermissions({ data: { organizationSlug: orgSlug! } }),
    enabled: !!orgSlug,
    staleTime: 30_000,
  });
}

const OrganizationMembersTable: React.FC = () => {
  const orgSlug = useOrganizationSlug();
  const queryClient = useQueryClient();
  const { authClient } = useAuth();
  const { data: activeOrganization } = useActiveOrganization(
    authClient as OrganizationAuthClient,
  );
  const { localization: organizationLocalization, roles } =
    useAuthPlugin(organizationPlugin);

  const { data: permissions } = useMemberActionPermissions();
  const currentUserId = permissions?.currentUserId;
  const canInviteMember = permissions?.canInvite;
  const canUpdateMember = permissions?.canUpdate;
  const canDeleteMember = permissions?.canDelete;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string | undefined>('createdAt');
  const [sortDirection, setSortDirection] = useState<
    'asc' | 'desc' | undefined
  >('desc');
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');

  // `member.name`/`member.email` live on the joined `user` table, which the
  // org plugin's server-side filter can't reach (it only filters columns on
  // `member` itself) — so a text search has to fetch the batch unfiltered
  // and match client-side instead of paginating server-side.
  const isSearching = search.trim().length > 0;

  const memberListParams = {
    // Explicit limit avoids better-auth's 100-member default silently truncating search results.
    ...(isSearching
      ? { limit: MEMBER_SEARCH_LIMIT }
      : { limit: pageSize, offset: page * pageSize }),
    ...(sortBy ? { sortBy, sortDirection } : {}),
    ...(roleFilter !== 'all'
      ? {
          filterField: 'role',
          filterOperator: 'eq' as const,
          filterValue: roleFilter,
        }
      : {}),
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: organizationMembersListKey(orgSlug, memberListParams),
    queryFn: () =>
      listOrganizationMembers({
        data: { organizationSlug: orgSlug!, ...memberListParams },
      }),
    enabled: !!orgSlug,
    staleTime: 30_000,
  });

  const { mutate: updateMemberRole, isPending: isUpdatingRole } =
    useUpdateMemberRole(authClient as OrganizationAuthClient, {
      onSuccess: () => {
        toast.success(organizationLocalization.memberRoleUpdated);
        refetch();
      },
    });

  // Not derived from `data.members` — that's only the current page, which can miss the owner's own row.
  const isOwner = permissions?.callerRole === 'owner';

  const searchedMembers = (() => {
    if (!isSearching || !data?.members) return data?.members;
    const q = search.trim().toLowerCase();
    return data.members.filter(
      (member) =>
        member.user.name?.toLowerCase().includes(q) ||
        member.user.email?.toLowerCase().includes(q),
    );
  })();

  const visibleMembers = isSearching
    ? searchedMembers?.slice(page * pageSize, page * pageSize + pageSize)
    : data?.members;

  const total = isSearching
    ? (searchedMembers?.length ?? 0)
    : (data?.total ?? 0);

  // Depends on primitives, not raw query objects — react-query returns a new reference on every refetch, which would otherwise remount every actions cell.
  const columns = useMemo<DataTableColumnDef<MemberRow>[]>(
    () => [
      {
        id: 'member',
        header: 'Member',
        cell: ({ row }) => <UserView user={row.original.user} />,
      },
      {
        header: 'Role',
        accessorKey: 'role',
        enableSorting: true,
        cell: ({ row }) => (
          <span className="capitalize">{row.original.role}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        // Not gated on `activeOrganization` (client-only fetch) — the permissions driving these buttons are already server-rendered.
        cell: ({ row }) => (
          <MemberActionsCell
            member={row.original}
            isOwner={isOwner}
            isCurrentUser={currentUserId === row.original.userId}
            organization={activeOrganization ?? undefined}
            organizationLocalization={organizationLocalization}
            roles={roles}
            hasUpdatePermission={canUpdateMember}
            hasDeletePermission={canDeleteMember}
            updateMemberRole={updateMemberRole}
            isUpdatingRole={isUpdatingRole}
            onMemberListChange={refetch}
          />
        ),
      },
    ],
    // Depends on `activeOrganization?.id`, not the object, to avoid the reference churn this memo exists to prevent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeOrganization?.id,
      isOwner,
      currentUserId,
      organizationLocalization,
      roles,
      canUpdateMember,
      canDeleteMember,
      updateMemberRole,
      isUpdatingRole,
      refetch,
    ],
  );

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader title="Members" />

      <DataTable
        columns={columns}
        data={visibleMembers as MemberRow[] | undefined}
        isLoading={isLoading}
        isValidating={isFetching}
        refetch={refetch}
        getRowId={(row) => row.id}
        nameSearch
        pagination={{
          total,
          pageIndex: page,
          pageSize,
          goToPage: setPage,
        }}
        onParamsChange={(params: MemberListParams) => {
          // Check key presence, not value — DataTable includes search/page_size keys even when `undefined`.
          if ('search' in params) {
            setSearch(params.search ?? '');
            setPage(0);
            return;
          }
          if ('page_size' in params) {
            setPageSize(params.page_size!);
            return;
          }
          setSortBy(params.order_by);
          setSortDirection(params.direction);
          setPage(0);
        }}
        leadingToolBar={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ size: 'sm', variant: 'outline' }),
                )}
              >
                <Filter />
                {roleFilter === 'all'
                  ? 'Role'
                  : `Role: ${roles?.[roleFilter] ?? roleFilter}`}
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup
                  value={roleFilter}
                  onValueChange={(value) => {
                    setRoleFilter(value);
                    setPage(0);
                  }}
                >
                  <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                  {Object.entries(roles).map(([role, label]) => (
                    <DropdownMenuRadioItem key={role} value={role}>
                      {label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
        toolBar={[
          <Button
            key="invite"
            disabled={!canInviteMember}
            onClick={() => setInviteOpen(true)}
          >
            Invite member
          </Button>,
        ]}
      />

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={(next) => {
          setInviteOpen(next);
          if (!next) {
            queryClient.invalidateQueries({
              queryKey: organizationInvitationsListKey(orgSlug),
            });
          }
        }}
      />
    </div>
  );
};

export default OrganizationMembersTable;
