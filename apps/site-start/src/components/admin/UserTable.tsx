'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@api7/portal-ui/components/ui/alert-dialog';
import { Badge } from '@api7/portal-ui/components/ui/badge';
import { Button } from '@api7/portal-ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@api7/portal-ui/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@api7/portal-ui/components/ui/dropdown-menu';
import { Input } from '@api7/portal-ui/components/ui/input';
import { Label } from '@api7/portal-ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@api7/portal-ui/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useCreation } from 'ahooks';
import { MoreHorizontalIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  DataTable,
  type DataTableColumnDef,
} from '@/components/base/data-table';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/constants/common';
import {
  PATH_DASHBOARD_ORGANIZATIONS,
  PATH_DASHBOARD_USERS,
} from '@/constants/path-prefix';
import { authClient } from '@/lib/auth/client';

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  createdAt: Date;
};

type DialogState =
  | { type: 'role'; user: AdminUserListItem }
  | { type: 'ban'; user: AdminUserListItem }
  | { type: 'unban'; user: AdminUserListItem }
  | { type: 'delete'; user: AdminUserListItem }
  | null;

const QUERY_KEY = 'admin-users';

function parsePage(value: string | null, fallback: number): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return fallback;
  return parseInt(value, 10);
}

export default function UserTable() {
  const navigate = useNavigate();
  const { searchStr } = useLocation();
  const searchParams = new URLSearchParams(searchStr);
  const queryClient = useQueryClient();

  const page = parsePage(searchParams.get('page'), DEFAULT_PAGE);
  const pageSize = Math.min(
    parsePage(searchParams.get('page_size'), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  const search = searchParams.get('search')?.trim() || undefined;

  const [dialog, setDialog] = useState<DialogState>(null);
  const [pending, setPending] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('user');

  const { data, isLoading, isError } = useQuery({
    queryKey: [QUERY_KEY, { page, pageSize, search }],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;
      const result = await authClient.admin.listUsers({
        query: {
          limit: pageSize,
          offset,
          sortBy: 'createdAt',
          sortDirection: 'desc',
          ...(search
            ? {
                searchValue: search,
                searchField: 'email',
                searchOperator: 'contains',
              }
            : {}),
        },
      });
      if (result.error)
        throw new Error(result.error.message || 'Failed to fetch users');
      return result.data;
    },
  });

  const users = (data?.users ?? []) as AdminUserListItem[];
  const total = data?.total ?? 0;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

  const makeHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchStr);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    }
    return `${PATH_DASHBOARD_USERS}?${params.toString()}`;
  };

  const closeDialog = () => {
    setDialog(null);
    setBanReason('');
  };

  const handleChangeRole = async () => {
    if (dialog?.type !== 'role') return;
    setPending(true);
    try {
      const result = await authClient.admin.setRole({
        userId: dialog.user.id,
        role: selectedRole as 'user' | 'admin',
      });
      if (result.error) {
        toast.error(result.error.message || 'Failed to update role');
        return;
      }
      toast.success('Role updated');
      closeDialog();
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setPending(false);
    }
  };

  const handleBan = async () => {
    if (dialog?.type !== 'ban') return;
    setPending(true);
    try {
      const result = await authClient.admin.banUser({
        userId: dialog.user.id,
        banReason: banReason.trim() || undefined,
      });
      if (result.error) {
        toast.error(result.error.message || 'Failed to ban user');
        return;
      }
      toast.success('User banned');
      closeDialog();
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to ban user');
    } finally {
      setPending(false);
    }
  };

  const handleUnban = async () => {
    if (dialog?.type !== 'unban') return;
    setPending(true);
    try {
      const result = await authClient.admin.unbanUser({
        userId: dialog.user.id,
      });
      if (result.error) {
        toast.error(result.error.message || 'Failed to unban user');
        return;
      }
      toast.success('User unbanned');
      closeDialog();
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unban user');
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async () => {
    if (dialog?.type !== 'delete') return;
    setPending(true);
    try {
      const result = await authClient.admin.removeUser({
        userId: dialog.user.id,
      });
      if (result.error) {
        toast.error(result.error.message || 'Failed to delete user');
        return;
      }
      toast.success('User deleted');
      closeDialog();
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setPending(false);
    }
  };

  const columns = useCreation<DataTableColumnDef<AdminUserListItem>[]>(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue() as string}</span>
        ),
      },
      {
        header: 'Email',
        accessorKey: 'email',
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">
            {getValue() as string}
          </span>
        ),
      },
      {
        header: 'Role',
        accessorKey: 'role',
        cell: ({ getValue }) => {
          const role = (getValue() as string | null | undefined) || 'user';
          return (
            <Badge variant={role === 'admin' ? 'default' : 'outline'}>
              {role}
            </Badge>
          );
        },
      },
      {
        header: 'Status',
        accessorKey: 'banned',
        cell: ({ row }) => {
          const { banned, banReason: reason } = row.original;
          if (banned) {
            return (
              <span title={reason ?? undefined}>
                <Badge variant="destructive">Banned</Badge>
              </span>
            );
          }
          return <Badge variant="secondary">Active</Badge>;
        },
      },
      {
        header: 'Organizations',
        id: 'organizations',
        cell: ({ row }) => {
          const href: string = `${PATH_DASHBOARD_ORGANIZATIONS}?user_id=${row.original.id}`;
          return (
            <Link
              to={href}
              className="text-primary underline-offset-4 hover:underline text-sm"
            >
              View
            </Link>
          );
        },
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) => {
          const user = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Open actions"
                  />
                }
              >
                <MoreHorizontalIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedRole(user.role || 'user');
                    setDialog({ type: 'role', user });
                  }}
                >
                  Change Role
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user.banned ? (
                  <DropdownMenuItem
                    onClick={() => setDialog({ type: 'unban', user })}
                  >
                    Unban
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => setDialog({ type: 'ban', user })}
                  >
                    Ban
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDialog({ type: 'delete', user })}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        isError={isError}
        nameSearch
        text={{
          searchPlaceholder: 'Search by email',
          noData: 'No users found.',
        }}
        onParamsChange={(params: Record<string, unknown>) => {
          const overrides: Record<string, string | undefined> = { page: '1' };
          if ('search' in params)
            overrides.search =
              (params.search as string | undefined) || undefined;
          if ('page_size' in params)
            overrides.page_size = String(params.page_size);
          navigate({ href: makeHref(overrides) });
        }}
        pagination={{
          total,
          pageIndex: page - 1,
          pageSize,
          goToPage: (targetPage) =>
            navigate({ href: makeHref({ page: String(targetPage + 1) }) }),
          text: {
            results: 'Results:',
            of: 'of',
          },
        }}
      />

      <Dialog
        open={dialog?.type === 'role'}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label htmlFor="role-select">
              Role for{' '}
              <span className="font-medium">
                {dialog?.type === 'role' ? dialog.user.email : ''}
              </span>
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(v) => {
                if (v !== null) setSelectedRole(v);
              }}
            >
              <SelectTrigger id="role-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="user">user</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={pending}>
              {pending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.type === 'ban'}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Ban{' '}
              <span className="font-medium text-foreground">
                {dialog?.type === 'ban' ? dialog.user.email : ''}
              </span>
              ? This will revoke their access.
            </p>
            <Label htmlFor="ban-reason">Reason (optional)</Label>
            <Input
              id="ban-reason"
              placeholder="Enter ban reason"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBan}
              disabled={pending}
            >
              {pending ? 'Banning...' : 'Ban User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={dialog?.type === 'unban'}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unban User</AlertDialogTitle>
            <AlertDialogDescription>
              Restore access for{' '}
              <span className="font-medium text-foreground">
                {dialog?.type === 'unban' ? dialog.user.email : ''}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog} disabled={pending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUnban} disabled={pending}>
              {pending ? 'Unbanning...' : 'Unban'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={dialog?.type === 'delete'}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete{' '}
              <span className="font-medium text-foreground">
                {dialog?.type === 'delete' ? dialog.user.email : ''}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog} disabled={pending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
