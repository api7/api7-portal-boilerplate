'use client';

import { Button } from '@api7/portal-ui/components/ui/button';
import { ButtonGroup } from '@api7/portal-ui/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@api7/portal-ui/components/ui/dropdown-menu';
import { useCreation } from 'ahooks';
import {
  EllipsisVerticalIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';

import {
  DataTable,
  type DataTableColumnDef,
} from '@/components/base/data-table';
import { tableColDesc } from '@/components/slices/table-col/desc';
import { tableColLabels } from '@/components/slices/table-col/labels';
import TimeFormat from '@/components/slices/time-format';
import { DEFAULT_LIST_PARAMS } from '@/constants/common';
import { useCanManageApplications } from '@/lib/auth/useApplicationPermission';
import useDisclosure from '@/lib/hooks/useDisclosure';
import useCredentialList, {
  type CredentialParams,
} from '@/lib/query/useCredentialList';
import type {
  ApplicationCredential,
  BasicAuthCredential,
  BasicAuthPluginValue,
  PluginCredential,
} from '@/types/portal-sdk';
import BasicAuthAddDrawer from './BasicAuthAddDrawer';
import BasicAuthDetailDrawer from './BasicAuthDetailDrawer';
import BasicAuthRotateModal from './BasicAuthRotateModal';
import CredentialDeleteModal from './CredentialDeleteModal';
import CredentialEditDrawer from './CredentialEditDrawer';
import SecretAlert from './SecretAlert';

const AddBasicAuthBtn = ({
  refetch,
  setAlertData,
  disabled,
}: {
  refetch: () => void;
  setAlertData: (data: BasicAuthPluginValue) => void;
  disabled?: boolean;
}) => {
  const addDisclosure = useDisclosure({ onClose: refetch });
  return (
    <>
      <Button disabled={disabled} onClick={addDisclosure.setOpen}>
        <PlusIcon />
        Add Basic Authentication Credential
      </Button>
      <BasicAuthAddDrawer {...addDisclosure} setAlertData={setAlertData} />
    </>
  );
};

const BasicAuthTable: React.FC<
  Pick<CredentialParams, 'application_id'> & {
    leadingToolBar?: React.ReactNode;
  }
> = ({ application_id, leadingToolBar }) => {
  const { canManageApplications } = useCanManageApplications();
  const req = useCredentialList({
    savePage: false,
    initParams: {
      application_id,
      auth_method: 'basic-auth',
      ...DEFAULT_LIST_PARAMS,
    },
  });
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
  const [alertData, setAlertData] = useState<BasicAuthPluginValue>();
  const [alertVariant, setAlertVariant] = useState<'created' | 'rotated'>(
    'created',
  );

  const columns = useCreation<DataTableColumnDef<ApplicationCredential>[]>(
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
      } as DataTableColumnDef<ApplicationCredential>),
      tableColLabels<ApplicationCredential>({
        header: 'Labels',
        accessorKey: 'labels',
      } as DataTableColumnDef<ApplicationCredential>),
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
          items={[
            { label: 'Username', value: alertData.username },
            { label: 'Password', value: alertData.password },
          ]}
          title={
            alertVariant === 'rotated'
              ? 'Password Regenerated'
              : 'Basic Authentication Credential Created'
          }
          description={
            alertVariant === 'rotated'
              ? 'Please copy and save the new password immediately, the old password has been invalidated. You will not be able to view it again.'
              : 'Please copy and save the password immediately, you will not be able to view it again.'
          }
        />
      )}
      <BasicAuthDetailDrawer
        {...detailDisclosure}
        oldData={curData as BasicAuthCredential}
      />
      <BasicAuthRotateModal
        {...rotateDisclosure}
        oldData={curData as BasicAuthCredential}
        setAlertData={(data) => {
          setAlertVariant('rotated');
          setAlertData(data);
        }}
      />
      <CredentialDeleteModal
        {...deleteDisclosure}
        oldData={curData as PluginCredential}
      />
      <CredentialEditDrawer
        title={'Edit Basic Authentication Credential'}
        {...editDisclosure}
        oldData={curData as PluginCredential}
      />
      <DataTable
        data-cy="basic-auth-table"
        columns={columns}
        {...req}
        nameSearch
        leadingToolBar={leadingToolBar}
        text={{ searchPlaceholder: 'Search name, description, label' }}
        toolBar={[
          <AddBasicAuthBtn
            key="add"
            refetch={refetch}
            setAlertData={(data) => {
              setAlertVariant('created');
              setAlertData(data);
            }}
            disabled={!canManageApplications}
          />,
        ]}
        savePage={false}
      />
    </>
  );
};

export default BasicAuthTable;
