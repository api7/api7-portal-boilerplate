'use client';

import { Badge } from '@api7/portal-ui/components/ui/badge';
import { Button, buttonVariants } from '@api7/portal-ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@api7/portal-ui/components/ui/dropdown-menu';
import { Spinner } from '@api7/portal-ui/components/ui/spinner';
import { organizationPlugin } from '@api7/portal-ui/lib/auth/organization-plugin';
import { cn } from '@api7/portal-ui/lib/utils';
import type { OrganizationLocalization } from '@better-auth-ui/core/plugins';
import {
  type OrganizationAuthClient,
  useAuth,
  useAuthPlugin,
  useCancelInvitation,
} from '@better-auth-ui/react';
import { useQuery } from '@tanstack/react-query';
import type { Invitation } from 'better-auth/client';
import { Filter } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  DataTable,
  type DataTableColumnDef,
} from '@/components/base/data-table';
import { SectionHeader } from '@/components/base/section-header';
import { listOrganizationInvitations } from '@/lib/dal/organization-members';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import { organizationInvitationsListKey } from '@/lib/query/keys';
import { useMemberActionPermissions } from './OrganizationMembersTable';

const statusBadgeClasses: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  accepted: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rejected: 'bg-destructive/10 text-destructive',
  canceled: 'bg-muted text-muted-foreground',
  expired: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

// better-auth only marks an invitation `rejected`/`canceled`/`accepted` on an
// explicit action — a `pending` one past its `expiresAt` just sits there
// looking active. "expired" isn't a real `InvitationStatus`; it's derived
// here so the UI (and the status filter) can tell the two apart.
type EffectiveInvitationStatus = Invitation['status'] | 'expired';

function getEffectiveInvitationStatus(
  invitation: Invitation,
): EffectiveInvitationStatus {
  if (
    invitation.status === 'pending' &&
    new Date(invitation.expiresAt).getTime() < Date.now()
  ) {
    return 'expired';
  }
  return invitation.status;
}

// "expired" isn't a real invitation status better-auth's localization object
// covers — it's derived client-side (see `getEffectiveInvitationStatus`), so
// its label lives here rather than in the upstream plugin's localization.
const EXPIRED_STATUS_LABEL = 'Expired';

function getStatusLabel(
  status: string,
  organizationLocalization: OrganizationLocalization,
) {
  if (status === 'expired') return EXPIRED_STATUS_LABEL;
  return (
    organizationLocalization[status as keyof OrganizationLocalization] ?? status
  );
}

type InvitationListParams = { search?: string };

function CancelInvitationCell({
  invitation,
  organizationLocalization,
  canCancel,
  onCanceled,
}: {
  invitation: Invitation;
  organizationLocalization: OrganizationLocalization;
  canCancel?: boolean;
  onCanceled: () => void;
}) {
  const { authClient } = useAuth();
  const { mutate: cancelInvitation, isPending: cancelPending } =
    useCancelInvitation(authClient as OrganizationAuthClient, {
      onSuccess: onCanceled,
    });

  if (!canCancel || invitation.status !== 'pending') return null;

  return (
    <div className="flex justify-end">
      <Button
        variant="ghost"
        className="text-destructive hover:text-destructive"
        disabled={cancelPending}
        onClick={() => cancelInvitation({ invitationId: invitation.id })}
      >
        {cancelPending && <Spinner />}
        {organizationLocalization.cancelInvitation}
      </Button>
    </div>
  );
}

// Matches the loader's prefetch key exactly so the initial `useQuery` call
// below hits the SSR-hydrated cache instead of fetching on mount.
export function useOrganizationInvitations() {
  const orgSlug = useOrganizationSlug();
  return useQuery({
    queryKey: organizationInvitationsListKey(orgSlug),
    queryFn: () =>
      listOrganizationInvitations({ data: { organizationSlug: orgSlug! } }),
    enabled: !!orgSlug,
    staleTime: 30_000,
  });
}

const OrganizationInvitationsTable: React.FC = () => {
  const { localization: organizationLocalization, roles } =
    useAuthPlugin(organizationPlugin);

  // Same queryKey the members table's permissions already prefetched via the
  // route loader — this is a cache hit, not an extra round-trip.
  const { data: permissions } = useMemberActionPermissions();

  const {
    data: invitations,
    isFetching,
    refetch,
  } = useOrganizationInvitations();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  // Defaults to the status a reviewer actually cares about day to day — an
  // expired-but-still-"pending" invitation is exactly what this default is
  // meant to hide until asked for. Anything else is one click away.
  const [statusFilter, setStatusFilter] = useState('pending');

  // `listInvitations` has no server-side pagination/filtering at all — the
  // whole org's invitations come back in one batch (SSR-prefetched), so
  // search/role/status filtering happens client-side. The list is small
  // enough that it's shown in full, with no pagination controls.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (invitations ?? []).filter(
      (invitation) =>
        (roleFilter === 'all' || invitation.role === roleFilter) &&
        (statusFilter === 'all' ||
          getEffectiveInvitationStatus(invitation) === statusFilter) &&
        invitation.email.toLowerCase().includes(q),
    );
  }, [invitations, search, roleFilter, statusFilter]);

  const columns = useMemo<DataTableColumnDef<Invitation>[]>(
    () => [
      {
        header: 'Email',
        accessorKey: 'email',
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.email}</span>
        ),
      },
      {
        header: 'Invited at',
        accessorKey: 'createdAt',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {new Date(row.original.createdAt).toLocaleString(undefined, {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </span>
        ),
      },
      {
        header: 'Role',
        accessorKey: 'role',
        cell: ({ row }) => (
          <span className="text-sm">
            {roles?.[row.original.role] ?? row.original.role}
          </span>
        ),
      },
      {
        header: 'Expires at',
        accessorKey: 'expiresAt',
        cell: ({ row }) => {
          const expired =
            getEffectiveInvitationStatus(row.original) === 'expired';
          return (
            <span
              className={cn(
                'text-xs tabular-nums whitespace-nowrap',
                expired
                  ? 'text-muted-foreground/50 line-through'
                  : 'text-muted-foreground',
              )}
            >
              {new Date(row.original.expiresAt).toLocaleString(undefined, {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </span>
          );
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          const status = getEffectiveInvitationStatus(row.original);
          return (
            <Badge variant="secondary" className={statusBadgeClasses[status]}>
              {getStatusLabel(status, organizationLocalization)}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <CancelInvitationCell
            invitation={row.original}
            organizationLocalization={organizationLocalization}
            canCancel={permissions?.canCancelInvitation}
            onCanceled={refetch}
          />
        ),
      },
    ],
    [
      roles,
      organizationLocalization,
      permissions?.canCancelInvitation,
      refetch,
    ],
  );

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader title="Invitations" />

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={false}
        isValidating={isFetching}
        refetch={refetch}
        getRowId={(row) => row.id}
        nameSearch
        hidePagination
        onParamsChange={(params: InvitationListParams) => {
          if ('search' in params) {
            setSearch(params.search ?? '');
          }
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
                  onValueChange={setRoleFilter}
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

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ size: 'sm', variant: 'outline' }),
                )}
              >
                <Filter />
                {statusFilter === 'all'
                  ? 'Status'
                  : `Status: ${getStatusLabel(statusFilter, organizationLocalization)}`}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                  {(
                    [
                      'pending',
                      'expired',
                      'accepted',
                      'rejected',
                      'canceled',
                    ] as const
                  ).map((status) => (
                    <DropdownMenuRadioItem key={status} value={status}>
                      {getStatusLabel(status, organizationLocalization)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
    </div>
  );
};

export default OrganizationInvitationsTable;
