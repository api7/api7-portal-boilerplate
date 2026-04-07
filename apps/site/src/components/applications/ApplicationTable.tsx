'use client';

import { memo, useState } from 'react';

import { useCreation } from 'ahooks';
import { Button, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import ApplicationAddDrawer from './ApplicationAddDrawer';
import ApplicationDeleteModal from './ApplicationDeleteModal';
import ApplicationEditDrawer from './ApplicationEditDrawer';
import { tableColDesc } from '@/components/slices/table-col/desc';
import { tableColLabels } from '@/components/slices/table-col/labels';
import TimeFormat from '@/components/slices/time-format';
import IconImage from '@/components/ui/icon-image';
import { MoreMenu } from '@/components/ui/more-menu';
import A7Table from '@/components/ui/table';
import { PATH_APPLICATIONS } from '@/constants/path-prefix';
import { useCanManageApplications } from '@/lib/auth/useApplicationPermission';
import useDisclosure from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import useApplicationList from '@/lib/query/useApplicationList';
import useLabelList from '@/lib/query/useLabelList';
import type { DeveloperApplication } from '@api7/portal-sdk/unstable-types';
import Link from 'next/link';

const AddApplicationBtn = memo(
  ({ refetch, disabled }: { refetch: () => void; disabled?: boolean }) => {
    const addDisclosure = useDisclosure({ onClose: refetch });
    return (
      <>
        <Button
          variant="filled"
          type="primary"
          disabled={disabled}
          icon={<IconImage type="add" alt="add" className="brightness-0 invert" />}
          onClick={addDisclosure.setOpen}
        >
          Add Application
        </Button>
        <ApplicationAddDrawer {...addDisclosure} />
      </>
    );
  }
);

AddApplicationBtn.displayName = 'AddApplicationBtn';

const ApplicationTable: React.FC = () => {
  const orgSlug = useOrganizationSlug();
  const { canManageApplications } = useCanManageApplications();
  const req = useApplicationList({ savePage: true });
  const labelReq = useLabelList({ resourceType: 'developer_application' });
  const refetch = () => {
    req.refetch();
    labelReq.refetch();
  };
  const editDisclosure = useDisclosure({ onClose: refetch });
  const deleteDisclosure = useDisclosure({ onClose: refetch });
  const [curData, setCurData] = useState<DeveloperApplication | undefined>();
  const columns = useCreation<ColumnsType<DeveloperApplication>>(
    () => [
      {
        title: 'Name',
        dataIndex: 'name',
        render: (name, detail) => {
          const href = orgSlug
            ? `/${orgSlug}${PATH_APPLICATIONS}/detail?id=${detail.id}`
            : `${PATH_APPLICATIONS}/detail?id=${detail.id}`;

          return (
            <Link passHref href={href}>
              <Typography.Link>{name}</Typography.Link>
            </Link>
          );
        },
      },
      tableColDesc<DeveloperApplication>({
        title: 'Description',
        dataIndex: 'desc',
      }),
      tableColLabels<DeveloperApplication>({
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
        render: (id, data: DeveloperApplication) => (
          <MoreMenu
            items={[
              {
                key: 'edit',
                label: 'Edit Basics',
                'data-testid': 'application-edit-basics',
                disabled: !canManageApplications,
                onClick: () => {
                  setCurData(data);
                  editDisclosure.setOpen();
                },
              },
              {
                key: 'delete',
                label: 'Delete',
                className: 'text-red-500',
                'data-testid': 'application-delete',
                disabled: !canManageApplications,
                onClick: () => {
                  setCurData(data);
                  deleteDisclosure.setOpen();
                },
              },
            ]}
            menuButtonProps={{ disabled: !canManageApplications }}
          />
        ),
      },
    ],
    [req, labelReq, orgSlug, canManageApplications]
  );

  return (
    <>
      <A7Table
        data-testid="application-table"
        columns={columns}
        {...req}
        nameSearch
        text={{ searchPlaceholder: 'Search name, description, label' }}
        toolBar={[
          <AddApplicationBtn
            key="add"
            refetch={refetch}
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
