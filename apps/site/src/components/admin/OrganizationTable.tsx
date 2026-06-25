'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useCreation } from 'ahooks';
import {
  MoreHorizontal,
  ShieldPlus,
  Trash2,
  UserRoundSearch,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/base/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PATH_DASHBOARD_ORGANIZATIONS } from '@/constants/path-prefix';
import {
  deleteOrganizationAsAdmin,
  takeoverOrganization,
} from '@/lib/actions/admin-organization';
import { authClient } from '@/lib/auth/client';
import type { AdminOrganizationListItem } from '@/lib/dal/admin-organization';

type Props = {
  data: AdminOrganizationListItem[];
  total: number;
  page: number;
  pageSize: number;
  search?: string;
};

function ActionCell({
  organizationId,
  organizationName,
  organizationSlug,
  ownerId,
  onDeleted,
}: {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  ownerId: string | null;
  onDeleted: () => void;
}) {
  const [takeoverOpen, setTakeoverOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [impersonatePending, setImpersonatePending] = useState(false);
  const [takeoverPending, setTakeoverPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const handleImpersonate = async () => {
    if (!ownerId) return;
    setImpersonatePending(true);
    try {
      const result = await authClient.admin.impersonateUser({
        userId: ownerId,
      });
      if (result.error) {
        toast.error(result.error.message || 'Failed to impersonate user');
        return;
      }
      window.location.assign(`/${organizationSlug}/api-hub`);
    } finally {
      setImpersonatePending(false);
    }
  };

  const handleTakeover = async () => {
    setTakeoverPending(true);
    try {
      await takeoverOrganization(organizationId);
      toast.success(`You have been added as owner of "${organizationName}".`);
      setTakeoverOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Takeover failed.');
    } finally {
      setTakeoverPending(false);
    }
  };

  const handleDelete = async () => {
    setDeletePending(true);
    try {
      await deleteOrganizationAsAdmin(organizationId);
      toast.success(`Organization "${organizationName}" has been deleted.`);
      setDeleteOpen(false);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Deletion failed.');
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Open actions" />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={!ownerId || impersonatePending}
            onClick={handleImpersonate}
          >
            <UserRoundSearch />
            {impersonatePending ? 'Impersonating…' : 'Impersonate'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTakeoverOpen(true)}>
            <ShieldPlus />
            Takeover
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={takeoverOpen} onOpenChange={setTakeoverOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Take over organization</AlertDialogTitle>
            <AlertDialogDescription>
              You will be added as an owner of{' '}
              <strong>{organizationName}</strong>. This gives you full access to
              the organization and its resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={takeoverPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTakeover}
              disabled={takeoverPending}
            >
              {takeoverPending ? 'Processing…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete organization</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{organizationName}</strong>{' '}
              and all its members. The associated portal developer and all its
              resources will also be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePending}
            >
              {deletePending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function OrganizationTable({
  data,
  total,
  page,
  pageSize,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const makeHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    }
    return `${PATH_DASHBOARD_ORGANIZATIONS}?${params.toString()}`;
  };

  const columns = useCreation<ColumnDef<AdminOrganizationListItem>[]>(
    () => [
      {
        header: 'Organization',
        accessorKey: 'name',
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue() as string}</span>
        ),
      },
      {
        header: 'Slug',
        accessorKey: 'slug',
        cell: ({ getValue }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            {getValue() as string}
          </code>
        ),
      },
      {
        header: 'Applications',
        accessorKey: 'application_count',
      },
      {
        header: 'Owner',
        accessorKey: 'owner',
        cell: ({ getValue }) => {
          const owner = getValue() as AdminOrganizationListItem['owner'];
          if (!owner)
            return (
              <span className="text-muted-foreground">No owner found</span>
            );
          return (
            <div className="flex flex-col gap-0.5">
              <span>{owner.name || '—'}</span>
              <span className="text-xs text-muted-foreground">
                {owner.email}
              </span>
            </div>
          );
        },
      },
      {
        header: 'Action',
        id: 'action',
        cell: ({ row }) => (
          <ActionCell
            organizationId={row.original.id}
            organizationName={row.original.name}
            organizationSlug={row.original.slug}
            ownerId={row.original.owner?.user_id ?? null}
            onDeleted={() => router.refresh()}
          />
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={false}
      nameSearch
      text={{
        searchPlaceholder: 'Search by name or slug',
        noData: 'No organizations found.',
      }}
      onParamsChange={(params: Record<string, unknown>) => {
        const overrides: Record<string, string | undefined> = { page: '1' };
        if ('search' in params)
          overrides.search = (params.search as string | undefined) || undefined;
        if ('page_size' in params)
          overrides.page_size = String(params.page_size);
        router.push(makeHref(overrides));
      }}
      pagination={{
        total,
        pageIndex: page - 1,
        pageSize,
        goToPage: (targetPage) =>
          router.push(makeHref({ page: String(targetPage + 1) })),
        text: { results: 'Results:', of: 'of' },
      }}
    />
  );
}
