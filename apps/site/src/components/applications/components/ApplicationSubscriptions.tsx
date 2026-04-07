'use client';

import { useState } from 'react';

import { useCreation } from 'ahooks';
import { Button, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PRODUCT_STATUS_CONFIG, useStatusCol } from './StatusFilter';
import SubscribeAPIProductModal from './SubscribeAPIProductModal';
import UnsubscribeModal from './UnsubscribeModal';
import TimeFormat from '@/components/slices/time-format';
import IconImage from '@/components/ui/icon-image';
import { MoreMenu } from '@/components/ui/more-menu';
import A7Table from '@/components/ui/table';
import { useCanManageApplications } from '@/lib/auth/useApplicationPermission';
import { useApiHubBasePath } from '@/lib/hooks/useApiHubBasePath';
import useDisclosure from '@/lib/hooks/useDisclosure';
import useSubscriptionList from '@/lib/query/useSubscriptionList';
import type { SubscriptionItem } from '@/types/portal-sdk';
import Link from 'next/link';

const SubscribeNewAPIProductBtn = ({
  applicationId,
  onSuccess,
  disabled,
}: {
  applicationId?: string;
  onSuccess?: () => void;
  disabled?: boolean;
}) => {
  const subscribeDisclosure = useDisclosure();

  return (
    <>
      <Button
        key="add"
        variant="filled"
        type="primary"
        disabled={disabled}
        icon={<IconImage type="add" alt="add" />}
        onClick={subscribeDisclosure.setOpen}
      >
        Subscribe to New API Product
      </Button>
      <SubscribeAPIProductModal
        {...subscribeDisclosure}
        applicationId={applicationId}
        onSuccess={onSuccess}
      />
    </>
  );
};

type ApplicationSubscriptionsProps = {
  id?: string;
};

const ApplicationSubscriptions = ({ id }: ApplicationSubscriptionsProps) => {
  const apiHubBasePath = useApiHubBasePath();
  const { canManageApplications } = useCanManageApplications();
  const req = useSubscriptionList({
    application_id: id,
  });

  const statusCol = useStatusCol<SubscriptionItem>({
    onParamsChange: req.onParamsChange,
    statusConfig: PRODUCT_STATUS_CONFIG,
  });

  const unsubscribeDisclosure = useDisclosure();
  const [curSubscription, setCurSubscription] =
    useState<SubscriptionItem | null>();

  const columns = useCreation<ColumnsType<SubscriptionItem>>(
    () => [
      {
        title: 'API Product',
        dataIndex: 'api_product_name',
        key: 'api_product_name',
        render: (name, record) => (
          <Link
            href={`${apiHubBasePath}/detail?id=${record.api_product_id}`}
            target="_blank"
          >
            <Typography.Link>{name}</Typography.Link>
          </Link>
        ),
      },
      statusCol,
      {
        title: 'Subscribed',
        dataIndex: 'subscribed_at',
        key: 'subscribed_at',
        render: (timestamp: number) => {
          if (!timestamp) return 'Not yet';
          return <TimeFormat time={timestamp} fromNow />;
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        render: (_, record) => (
          <MoreMenu
            items={[
              {
                key: 'unsubscribe',
                label: 'Unsubscribe',
                className: 'text-red-500',
                disabled: !canManageApplications,
                onClick: () => {
                  setCurSubscription(record);
                  unsubscribeDisclosure.setOpen();
                },
              },
            ]}
            menuButtonProps={{ disabled: !canManageApplications }}
          />
        ),
      },
    ],
    [statusCol, apiHubBasePath, canManageApplications]
  );

  return (
    <>
      <A7Table
        data-testid="application-subscriptions"
        columns={columns}
        nameSearch
        text={{
          searchPlaceholder: 'Search API product',
          noData: 'No subscriptions found',
        }}
        {...req}
        toolBar={[
          <SubscribeNewAPIProductBtn
            key="add"
            applicationId={id}
            onSuccess={req.refetch}
            disabled={!canManageApplications}
          />,
        ]}
        savePage={false}
      />
      <UnsubscribeModal
        id={curSubscription?.id}
        name={curSubscription?.api_product_name}
        {...unsubscribeDisclosure}
        onOk={req.refetch}
      />
    </>
  );
};

export default ApplicationSubscriptions;
