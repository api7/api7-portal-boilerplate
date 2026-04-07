'use client';

import { memo, useState } from 'react';

import { useCreation } from 'ahooks';
import { Button, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import CredentialDeleteModal from './CredentialDeleteModal';
import CredentialEditDrawer from './CredentialEditDrawer';
import KeyAuthAddDrawer from './KeyAuthAddDrawer';
import KeyAuthDetailDrawer from './KeyAuthDetailDrawer';
import KeyAuthRotateModal from './KeyAuthRotateModal';
import Menu from '@/components/slices/menu';
import { tableColDesc } from '@/components/slices/table-col/desc';
import { tableColLabels } from '@/components/slices/table-col/labels';
import TimeFormat from '@/components/slices/time-format';
import IconImage from '@/components/ui/icon-image';
import A7Table from '@/components/ui/table';
import { DEFAULT_LIST_PARAMS } from '@/constants/common';
import { useCanManageApplications } from '@/lib/auth/useApplicationPermission';
import useDisclosure from '@/lib/hooks/useDisclosure';
import useCredentialList, {
  type CredentialParams,
} from '@/lib/query/useCredentialList';
import useLabelList from '@/lib/query/useLabelList';
import type {
  ApplicationCredential,
  KeyAuthCredential,
  PluginCredential,
} from '@/types/portal-sdk';

const AddKeyAuthBtn = ({
  refetch,
  disabled,
}: {
  refetch: () => void;
  disabled?: boolean;
}) => {
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
        Add Key Authentication Credential
      </Button>
      <KeyAuthAddDrawer {...addDisclosure} />
    </>
  );
};

const KeyAuthTable: React.FC<Pick<CredentialParams, 'application_id'>> = ({
  application_id,
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
  const labelReq = useLabelList({ resourceType: 'developer_credential' });
  const refetch = () => {
    req.refetch();
    labelReq.refetch();
  };
  const editDisclosure = useDisclosure({ onClose: refetch });
  const detailDisclosure = useDisclosure({ onClose: refetch });
  const deleteDisclosure = useDisclosure({ onClose: refetch });
  const rotateDisclosure = useDisclosure({ onClose: refetch });
  const [curData, setCurData] = useState<ApplicationCredential | undefined>();
  const columns = useCreation<ColumnsType<ApplicationCredential>>(
    () => [
      {
        title: 'Name',
        dataIndex: 'name',
        sorter: true,
        render: (name, detail) => (
          <Typography.Link
            onClick={() => {
              setCurData(detail);
              detailDisclosure.setOpen();
            }}
          >
            {name}
          </Typography.Link>
        ),
      },
      tableColDesc<ApplicationCredential>({
        title: 'Description',
        dataIndex: 'desc',
      }),
      tableColLabels<ApplicationCredential>({
        title: 'Labels',
        dataIndex: 'labels',
        onParamsChange: req.onParamsChange,
        ...labelReq,
      }),
      {
        title: 'Updated',
        dataIndex: 'updated_at',
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
              className="px-0"
              disabled={!canManageApplications}
              onClick={() => {
                setCurData(data);
                rotateDisclosure.setOpen();
              }}
            >
              Rotate
            </Button>
            <Menu
              items={[
                {
                  key: 'edit',
                  label: 'Edit Basics',
                  disabled: !canManageApplications,
                  onClick: () => {
                    setCurData(data);
                    editDisclosure.setOpen();
                  },
                },
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
          </Button.Group>
        ),
      },
    ],
    [req, labelReq, canManageApplications]
  );

  return (
    <>
      <KeyAuthDetailDrawer {...detailDisclosure} oldData={curData as KeyAuthCredential} />
      <CredentialEditDrawer
        title={'Edit Key Authentication Credential'}
        {...editDisclosure}
        oldData={curData as PluginCredential}
      />
      <KeyAuthRotateModal {...rotateDisclosure} oldData={curData as KeyAuthCredential} />
      <CredentialDeleteModal {...deleteDisclosure} oldData={curData as PluginCredential} />
      <A7Table
        data-cy="key-auth-table"
        columns={columns}
        {...req}
        nameSearch
        text={{ searchPlaceholder: 'Search name, description, label' }}
        toolBar={[
          <AddKeyAuthBtn
            key="add"
            refetch={refetch}
            disabled={!canManageApplications}
          />,
        ]}
        savePage={false}
      />
    </>
  );
};

export default KeyAuthTable;
