'use client';

import { memo, useState } from 'react';

import { useCreation } from 'ahooks';
import { Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import OAuthAddDrawer from './OAuthAddDrawer';
import { OAuthAlert } from './OAuthAlert';
import OAuthDeleteModal from './OAuthDeleteModal';
import OAuthEditDrawer from './OAuthEditDrawer';
import { tableColDesc } from '@/components/slices/table-col/desc';
import TimeFormat from '@/components/slices/time-format';
import IconImage from '@/components/ui/icon-image';
import A7Table from '@/components/ui/table';
import { DEFAULT_LIST_PARAMS } from '@/constants/common';
import useDisclosure from '@/lib/hooks/useDisclosure';
import useCredentialList, {
  type CredentialParams,
} from '@/lib/query/useCredentialList';
import type {
  ApplicationCredential,
  OAuthCredential,
  OAuthCredentialBasics,
} from '@/types/portal-sdk';

const AddOAuthBtn = memo(function AddOAuthBtn({
  refetch,
  setAlertData,
}: {
  refetch: () => void;
  setAlertData: (data: OAuthCredentialBasics['oauth']) => void;
}) {
  const addDisclosure = useDisclosure({ onClose: refetch });
  return (
    <>
      <Button
        variant="filled"
        type="primary"
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
  const deleteDisclosure = useDisclosure({
    onClose: () => {
      req.refetch();
      setAlertData(undefined);
    },
  });
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
        render: (id, data) => (
          <Button.Group>
            <Button
              type="link"
              className="px-0 mr-4"
              onClick={() => {
                setCurData(data);
                editDisclosure.setOpen();
              }}
            >
              Edit
            </Button>
            <Button
              type="link"
              className="px-0 text-red-500"
              onClick={() => {
                setCurData(data);
                deleteDisclosure.setOpen();
              }}
            >
              Delete
            </Button>
          </Button.Group>
        ),
      },
    ],
    [req]
  );

  return (
    <>
      {Boolean(alertData?.client_secret) && (
        <OAuthAlert
          clientID={alertData?.client_id ?? ''}
          clientSecret={alertData?.client_secret ?? ''}
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
      <A7Table
        data-cy="key-auth-table"
        columns={columns}
        {...req}
        nameSearch
        text={{ searchPlaceholder: 'Search Description' }}
        toolBar={[
          <AddOAuthBtn
            key="add"
            refetch={req.refetch}
            setAlertData={setAlertData}
          />,
        ]}
        savePage={false}
      />
    </>
  );
};

export default OAuthTable;
