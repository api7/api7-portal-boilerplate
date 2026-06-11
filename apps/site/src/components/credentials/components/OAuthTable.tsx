'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useCreation } from 'ahooks';
import {
  EllipsisVerticalIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react';
import { memo, useState } from 'react';

import { tableColDesc } from '@/components/slices/table-col/desc';
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
  OAuthCredential,
  OAuthCredentialBasics,
} from '@/types/portal-sdk';

import OAuthAddDrawer from './OAuthAddDrawer';
import { OAuthAlert } from './OAuthAlert';
import OAuthDeleteModal from './OAuthDeleteModal';
import OAuthEditDrawer from './OAuthEditDrawer';
import OAuthRotateModal from './OAuthRotateModal';

const isHttpBridgeOAuthCredential = (credential: ApplicationCredential) => {
  if (credential.type !== 'oauth') return false;
  const c = credential as OAuthCredential;
  return c.oauth?.dcr_provider?.provider_type === 'http_bridge';
};

const AddOAuthBtn = memo(function AddOAuthBtn({
  refetch,
  setAlertData,
  disabled,
}: {
  refetch: () => void;
  setAlertData: (data: OAuthCredentialBasics['oauth']) => void;
  disabled?: boolean;
}) {
  const addDisclosure = useDisclosure({ onClose: refetch });
  return (
    <>
      <Button disabled={disabled} onClick={addDisclosure.setOpen}>
        <PlusIcon />
        Add OAuth Client
      </Button>
      <OAuthAddDrawer {...addDisclosure} setAlertData={setAlertData} />
    </>
  );
});

const OAuthTable: React.FC<Pick<CredentialParams, 'application_id'> & { leadingToolBar?: React.ReactNode }> = ({
  application_id,
  leadingToolBar,
}) => {
  const { canManageApplications } = useCanManageApplications();
  const req = useCredentialList({
    savePage: false,
    initParams: {
      application_id,
      auth_method: 'oauth',
      ...DEFAULT_LIST_PARAMS,
    },
  });
  const { paramsOnlyStr: _, ...reqProps } = req;
  const editDisclosure = useDisclosure({ onClose: req.refetch });
  const [alertData, setAlertData] = useState<OAuthCredentialBasics['oauth']>();
  const [alertVariant, setAlertVariant] = useState<'created' | 'rotated'>('created');
  const deleteDisclosure = useDisclosure({
    onClose: () => {
      req.refetch();
      setAlertData(undefined);
    },
  });
  const rotateDisclosure = useDisclosure({ onClose: req.refetch });
  const [curData, setCurData] = useState<ApplicationCredential | undefined>();

  const columns = useCreation<ColumnDef<ApplicationCredential>[]>(
    () => [
      {
        header: 'Client ID',
        accessorFn: (row) => (row as OAuthCredential).oauth?.client_id,
        id: 'client_id',
      },
      tableColDesc<ApplicationCredential>({
        header: 'Description',
        accessorKey: 'desc',
      } as ColumnDef<ApplicationCredential>),
      {
        header: 'Identity Provider',
        accessorFn: (row) => (row as OAuthCredential).oauth?.dcr_provider?.name,
        id: 'identity_provider',
      },
      {
        header: 'Created',
        accessorKey: 'created_at',
        enableSorting: true,
        cell: ({ getValue }) => <TimeFormat time={getValue() as number} fromNow />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const canRegenerate = isHttpBridgeOAuthCredential(row.original);
          return (
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
                  {canRegenerate && (
                    <>
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          disabled={!canManageApplications}
                          onClick={() => {
                            setCurData(row.original);
                            rotateDisclosure.setOpen();
                          }}
                        >
                          <RefreshCwIcon />
                          Regenerate
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                    </>
                  )}
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
          );
        },
      },
    ],
    [req, canManageApplications],
  );

  return (
    <>
      {Boolean(alertData?.client_secret) && (
        <OAuthAlert
          clientID={alertData?.client_id ?? ''}
          clientSecret={alertData?.client_secret ?? ''}
          {...(alertVariant === 'rotated' && {
            title: 'OAuth Client Secret Regenerated',
            description:
              'Please copy and save the new Client Secret immediately, the old Client Secret has been invalidated.',
          })}
        />
      )}
      <OAuthEditDrawer
        title={'Edit OAuth Client'}
        {...editDisclosure}
        oldData={curData as OAuthCredential}
      />
      <OAuthDeleteModal
        {...deleteDisclosure}
        oldData={curData as OAuthCredential}
      />
      <OAuthRotateModal
        {...rotateDisclosure}
        oldData={curData as OAuthCredential}
        setAlertData={(data) => {
          setAlertVariant('rotated');
          setAlertData(data);
        }}
      />
      <DataTable
        data-cy="oauth-table"
        columns={columns}
        {...reqProps}
        nameSearch
        leadingToolBar={leadingToolBar}
        text={{ searchPlaceholder: 'Search Description' }}
        toolBar={[
          <AddOAuthBtn
            key="add"
            refetch={req.refetch}
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

export default OAuthTable;
