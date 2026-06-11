'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useCreation } from 'ahooks';
import {
  EllipsisVerticalIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';

import { tableColDesc } from '@/components/slices/table-col/desc';
import { tableColLabels } from '@/components/slices/table-col/labels';
import TimeFormat from '@/components/slices/time-format';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { DataTable } from '@/components/base/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DEFAULT_LIST_PARAMS } from '@/constants/common';
import { useCanManageApplications } from '@/lib/auth/useApplicationPermission';
import useDisclosure from '@/lib/hooks/useDisclosure';
import useCredentialList, {
  type CredentialParams,
} from '@/lib/query/useCredentialList';
import type {
  ApplicationCredential,
  KeyAuthCredential,
  PluginCredential,
} from '@/types/portal-sdk';

import CredentialDeleteModal from './CredentialDeleteModal';
import CredentialEditDrawer from './CredentialEditDrawer';
import KeyAuthAddDrawer from './KeyAuthAddDrawer';
import KeyAuthDetailDrawer from './KeyAuthDetailDrawer';
import KeyAuthRotateModal from './KeyAuthRotateModal';
import SecretAlert from './SecretAlert';

const AddKeyAuthBtn = ({
  refetch,
  setAlertData,
  disabled,
}: {
  refetch: () => void;
  setAlertData: (key: string) => void;
  disabled?: boolean;
}) => {
  const addDisclosure = useDisclosure({ onClose: refetch });
  return (
    <>
      <Button disabled={disabled} onClick={addDisclosure.setOpen}>
        <PlusIcon />
        Add Key Authentication Credential
      </Button>
      <KeyAuthAddDrawer {...addDisclosure} setAlertData={setAlertData} />
    </>
  );
};

const KeyAuthTable: React.FC<Pick<CredentialParams, 'application_id'> & { leadingToolBar?: React.ReactNode }> = ({
  application_id,
  leadingToolBar,
}) => {
  const { canManageApplications } = useCanManageApplications();
  const req = useCredentialList({
    savePage: false,
    initParams: {
      application_id,
      auth_method: 'key-auth',
      ...DEFAULT_LIST_PARAMS,
    },
  });
  const { paramsOnlyStr: _, ...reqProps } = req;
  const refetch = req.refetch;
  const editDisclosure = useDisclosure({ onClose: refetch });
  const detailDisclosure = useDisclosure({ onClose: refetch });
  const deleteDisclosure = useDisclosure({
    onClose: () => {
      refetch();
      setAlertData(undefined);
    },
  });
  const rotateDisclosure = useDisclosure({ onClose: refetch });
  const [curData, setCurData] = useState<ApplicationCredential | undefined>();
  const [alertData, setAlertData] = useState<string>();
  const [alertVariant, setAlertVariant] = useState<'created' | 'rotated'>(
    'created',
  );

  const columns = useCreation<ColumnDef<ApplicationCredential>[]>(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row, getValue }) => (
          <Button
            variant="link"
            className="px-0"
            onClick={() => {
              setCurData(row.original);
              detailDisclosure.setOpen();
            }}
          >
            {getValue() as string}
          </Button>
        ),
      },
      tableColDesc<ApplicationCredential>({
        header: 'Description',
        accessorKey: 'desc',
      } as ColumnDef<ApplicationCredential>),
      tableColLabels<ApplicationCredential>({
        header: 'Labels',
        accessorKey: 'labels',
      } as ColumnDef<ApplicationCredential>),
      {
        header: 'Updated',
        accessorKey: 'updated_at',
        enableSorting: true,
        cell: ({ getValue }) => <TimeFormat time={getValue() as number} fromNow />,
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
                    disabled={!canManageApplications}
                    onClick={() => {
                      setCurData(row.original);
                      rotateDisclosure.setOpen();
                    }}
                  >
                    <RefreshCwIcon />
                    Rotate
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
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
    [req, canManageApplications],
  );

  return (
    <>
      {alertData && (
        <SecretAlert
          items={[{ label: 'Key', value: alertData }]}
          title={
            alertVariant === 'rotated'
              ? 'Key Regenerated'
              : 'Key Authentication Credential Created'
          }
          description={
            alertVariant === 'rotated'
              ? 'Please copy and save the new key immediately, the old key has been invalidated. You will not be able to view it again.'
              : 'Please copy and save the key immediately, you will not be able to view it again.'
          }
        />
      )}
      <KeyAuthDetailDrawer
        {...detailDisclosure}
        oldData={curData as KeyAuthCredential}
      />
      <CredentialEditDrawer
        title={'Edit Key Authentication Credential'}
        {...editDisclosure}
        oldData={curData as PluginCredential}
      />
      <KeyAuthRotateModal
        {...rotateDisclosure}
        oldData={curData as KeyAuthCredential}
        setAlertData={(key) => {
          setAlertVariant('rotated');
          setAlertData(key);
        }}
      />
      <CredentialDeleteModal
        {...deleteDisclosure}
        oldData={curData as PluginCredential}
      />
      <DataTable
        data-cy="key-auth-table"
        columns={columns}
        {...reqProps}
        nameSearch
        leadingToolBar={leadingToolBar}
        text={{ searchPlaceholder: 'Search name, description, label' }}
        toolBar={[
          <AddKeyAuthBtn
            key="add"
            refetch={refetch}
            setAlertData={(key) => {
              setAlertVariant('created');
              setAlertData(key);
            }}
            disabled={!canManageApplications}
          />,
        ]}
        savePage={false}
      />
    </>
  );
};

export default KeyAuthTable;
