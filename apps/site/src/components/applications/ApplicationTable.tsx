'use client';

import { useCreation } from 'ahooks';
import { EllipsisVerticalIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { memo, useState } from 'react';

import { DataTable } from '@/components/base/data-table';
import { tableColDesc } from '@/components/slices/table-col/desc';
import { tableColLabels } from '@/components/slices/table-col/labels';
import TimeFormat from '@/components/slices/time-format';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PATH_APPLICATIONS } from '@/constants/path-prefix';
import { useCanManageApplications } from '@/lib/auth/useApplicationPermission';
import useDisclosure from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import useApplicationList from '@/lib/query/useApplicationList';
import type { DeveloperApplication } from '@api7/portal-sdk/unstable-types';
import type { ColumnDef } from '@tanstack/react-table';

import ApplicationAddDrawer from './ApplicationAddDrawer';
import ApplicationDeleteModal from './ApplicationDeleteModal';
import ApplicationEditDrawer from './ApplicationEditDrawer';

const AddApplicationButton = memo(
  ({ refetch, disabled }: { refetch: () => void; disabled?: boolean }) => {
    const addDisclosure = useDisclosure({ onClose: refetch });
    return (
      <>
        <Button disabled={disabled} onClick={addDisclosure.setOpen}>
          <PlusIcon />
          Add Application
        </Button>
        <ApplicationAddDrawer {...addDisclosure} />
      </>
    );
  },
);

AddApplicationButton.displayName = 'AddApplicationButton';

const ApplicationTable: React.FC = () => {
  const orgSlug = useOrganizationSlug();
  const { canManageApplications } = useCanManageApplications();
  const req = useApplicationList({ savePage: true });
  const editDisclosure = useDisclosure({ onClose: req.refetch });
  const deleteDisclosure = useDisclosure({ onClose: req.refetch });
  const [curData, setCurData] = useState<DeveloperApplication | undefined>();

  const columns = useCreation<ColumnDef<DeveloperApplication>[]>(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          const href = `/${orgSlug}${PATH_APPLICATIONS}/${row.original.id}`;
          return (
            <Link href={href} className="text-primary hover:underline text-sm font-medium">
              {row.original.name}
            </Link>
          );
        },
      },
      tableColDesc<DeveloperApplication>({
        header: 'Description',
        accessorKey: 'desc',
      } as ColumnDef<DeveloperApplication>),
      tableColLabels<DeveloperApplication>({
        header: 'Labels',
        accessorKey: 'labels',
      } as ColumnDef<DeveloperApplication>),
      {
        header: 'Updated',
        accessorKey: 'updated_at',
        enableSorting: true,
        cell: ({ getValue }) => (
          <TimeFormat time={getValue() as number} fromNow />
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <ButtonGroup aria-label="Button group">
            <Button
              variant="ghost"
              disabled={!canManageApplications}
              onClick={() => {
                setCurData(row.original);
                editDisclosure.setOpen();
              }}
            >
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="More Options"
                    disabled={!canManageApplications}
                  >
                    <EllipsisVerticalIcon />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={!canManageApplications}
                    onClick={() => {
                      setCurData(row.original);
                      deleteDisclosure.setOpen();
                    }}
                  >
                    <Trash2Icon />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
        ),
      },
    ],
    [req, orgSlug, canManageApplications],
  );

  return (
    <>
      <DataTable
        data-testid="application-table"
        columns={columns}
        {...req}
        nameSearch
        text={{ searchPlaceholder: 'Search name, description, label' }}
        toolBar={[
          <AddApplicationButton
            key="add"
            refetch={req.refetch}
            disabled={!canManageApplications}
          />,
        ]}
      />
      <ApplicationDeleteModal
        {...deleteDisclosure}
        id={curData?.id}
        name={curData?.name}
      />
      <ApplicationEditDrawer
        {...editDisclosure}
        data={curData as DeveloperApplication}
      />
    </>
  );
};

export default ApplicationTable;
