'use client';

import { memo, useState } from 'react';

import { useCreation } from 'ahooks';
import { Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import OAuthAddDrawer from './OAuthAddDrawer';
import { OAuthAlert } from './OAuthAlert';
import OAuthDeleteModal from './OAuthDeleteModal';
import OAuthEditDrawer from './OAuthEditDrawer';
import OAuthRotateModal from './OAuthRotateModal';
import Menu from '@/components/slices/menu';
import { tableColDesc } from '@/components/slices/table-col/desc';
import TimeFormat from '@/components/slices/time-format';
import IconImage from '@/components/ui/icon-image';
import A7Table from '@/components/ui/table';
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

const isHttpBridgeOAuthCredential = (credential: ApplicationCredential) =>
  credential.type === 'oauth' &&
  credential.oauth?.dcr_provider?.provider_type === 'http_bridge';

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
      <Button
        variant="filled"
        type="primary"
        disabled={disabled}
        icon={<IconImage type="add" />}
        onClick={addDisclosure.setOpen}
      >
        Add OAuth Client
      </Button>
      <OAuthAddDrawer {...addDisclosure} setAlertData={setAlertData} />
    </>
  );
});

const OAuthTable: React.FC<Pick<CredentialParams, 'application_id'>> = ({
  application_id,
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
  const editDisclosure = useDisclosure({ onClose: req.refetch });
  const [alertData, setAlertData] = useState<OAuthCredentialBasics['oauth']>();
  const [alertVariant, setAlertVariant] = useState<'created' | 'rotated'>(
    'created'
  );
  const deleteDisclosure = useDisclosure({
    onClose: () => {
      req.refetch();
      setAlertData(undefined);
    },
  });
  const rotateDisclosure = useDisclosure({ onClose: req.refetch });
  const [curData, setCurData] = useState<ApplicationCredential | undefined>();

  const columns = useCreation<ColumnsType<ApplicationCredential>>(
    () => [
      {
        title: 'Client ID',
        dataIndex: ['oauth', 'client_id'],
      },
      tableColDesc<ApplicationCredential>({
        title: 'Description',
        dataIndex: 'desc',
      }),
      {
        title: 'Identity Provider',
        dataIndex: ['oauth', 'dcr_provider', 'name'],
      },
      {
        title: 'Created',
        dataIndex: 'created_at',
        sorter: true,
        render: (value) => <TimeFormat time={value} fromNow />,
      },
      {
        title: 'Actions',
        dataIndex: 'id',
        fixed: 'right',
        render: (_, data) => {
          const canRegenerate = isHttpBridgeOAuthCredential(data);

          return (
            <div className="inline-flex items-center">
              <Button
                type="link"
                className="px-0 mr-4"
                disabled={!canManageApplications}
                onClick={() => {
                  setCurData(data);
                  editDisclosure.setOpen();
                }}
              >
                Edit
              </Button>
              <Menu
                items={[
                  ...(canRegenerate
                    ? [
                        {
                          key: 'regenerate',
                          label: 'Regenerate Secret',
                          disabled: !canManageApplications,
                          onClick: () => {
                            setCurData(data);
                            rotateDisclosure.setOpen();
                          },
                        },
                      ]
                    : []),
                  {
                    key: 'delete',
                    label: 'Delete',
                    labelProps: { className: 'text-red-500' },
                    disabled: !canManageApplications,
                    onClick: () => {
                      setCurData(data);
                      deleteDisclosure.setOpen();
                    },
                  },
                ]}
                disabled={!canManageApplications}
              />
            </div>
          );
        },
      },
    ],
    [req, canManageApplications]
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
      <A7Table
        data-cy="oauth-table"
        columns={columns}
        {...req}
        nameSearch
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
