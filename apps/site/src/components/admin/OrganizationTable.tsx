'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCreation } from 'ahooks';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/base/data-table';
import { PATH_DASHBOARD_ORGANIZATIONS } from '@/constants/path-prefix';
import type { AdminOrganizationListItem } from '@/lib/dal/admin-organization';
import ImpersonateOwnerButton from '@/components/admin/ImpersonateOwnerButton';

type Props = {
  data: AdminOrganizationListItem[];
  total: number;
  page: number;
  pageSize: number;
  search?: string;
};

export default function OrganizationTable({ data, total, page, pageSize }: Props) {
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
          if (!owner) return <span className="text-muted-foreground">No owner found</span>;
          return (
            <div className="flex flex-col gap-0.5">
              <span>{owner.name || '—'}</span>
              <span className="text-xs text-muted-foreground">{owner.email}</span>
            </div>
          );
        },
      },
      {
        header: 'Action',
        id: 'action',
        cell: ({ row }) =>
          row.original.owner ? (
            <ImpersonateOwnerButton userId={row.original.owner.user_id} />
          ) : (
            <ImpersonateOwnerButton userId="" disabled />
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
      text={{ searchPlaceholder: 'Search by name or slug', noData: 'No organizations found.' }}
      onParamsChange={(params: Record<string, unknown>) => {
        const overrides: Record<string, string | undefined> = { page: '1' };
        if ('search' in params) overrides.search = (params.search as string | undefined) || undefined;
        if ('page_size' in params) overrides.page_size = String(params.page_size);
        router.push(makeHref(overrides));
      }}
      pagination={{
        total,
        pageIndex: page - 1,
        pageSize,
        goToPage: (targetPage) =>
          router.push(makeHref({ page: String(targetPage + 1) })),
        text: {
          results: 'Results:',
          of: 'of',
        },
      }}
    />
  );
}
