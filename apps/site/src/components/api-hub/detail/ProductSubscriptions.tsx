import { useState } from 'react';

import { useSearchParams } from 'next/navigation';
import { useCreation } from 'ahooks';
import { Button, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { toast } from 'sonner';

import {
  PRODUCT_STATUS_CONFIG,
  useStatusCol,
} from '../../applications/components/StatusFilter';
import SubscribeAPIProductApplicationModal from '../../applications/components/SubscribeAPIProductApplicationModal';
import ValidateModal from '@/components/slices/modal/ValidateModal';
import { portalClient } from '@/lib/portal-sdk/client';
import TimeFormat from '@/components/slices/time-format';
import IconImage from '@/components/ui/icon-image';
import { MoreMenu } from '@/components/ui/more-menu';
import A7Table from '@/components/ui/table';
import { PATH_APPLICATIONS } from '@/constants/path-prefix';
import { useCanManageApplications } from '@/lib/auth/useApplicationPermission';
import useDisclosure from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import useSubscriptionList from '@/lib/query/useSubscriptionList';
import type { SubscriptionItem } from '@/types/portal-sdk';
import Link from 'next/link';

const SubscribeToApplicationBtn = ({
  productId,
  onSuccess,
  disabled,
}: {
  productId: string;
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
        icon={<IconImage type="add" />}
        onClick={subscribeDisclosure.setOpen}
      >
        Subscribe to Application
      </Button>
      <SubscribeAPIProductApplicationModal
        {...subscribeDisclosure}
        productId={productId}
        onSuccess={onSuccess}
      />
    </>
  );
};

const ProductSubscriptions = () => {
  const searchParams = useSearchParams();
  const productId = searchParams.get('id') || '';
  const orgSlug = useOrganizationSlug();
  const { canManageApplications } = useCanManageApplications();

  const req = useSubscriptionList({
    api_product_id: productId,
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
        title: 'Application',
        dataIndex: 'application_name',
        key: 'application_name',
        render: (name, record) => {
          const href = orgSlug
            ? `/${orgSlug}${PATH_APPLICATIONS}/detail?id=${record.application_id}`
            : `${PATH_APPLICATIONS}/detail?id=${record.application_id}`;
          return (
            <Link href={href} target="_blank">
              <Typography.Link>{name}</Typography.Link>
            </Link>
          );
        },
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
    [statusCol, orgSlug, canManageApplications]
  );

  const handleUnsubscribe = () => {
    if (!curSubscription?.id) return;

    return portalClient.subscription
      .unsubscribe(curSubscription.id)
      .then(() => {
        req.refetch();
        toast.success('Unsubscribed application successfully');
        unsubscribeDisclosure.onClose();
      });
  };

  return (
    <>
      <A7Table
        data-testid="product-subscriptions"
        columns={columns}
        nameSearch
        text={{
          searchPlaceholder: 'Search application',
          noData: 'No subscriptions found',
        }}
        {...req}
        toolBar={[
          <SubscribeToApplicationBtn
            key="add"
            productId={productId}
            onSuccess={req.refetch}
            disabled={!canManageApplications}
          />,
        ]}
        savePage={false}
      />
      {curSubscription && (
        <ValidateModal
          title="Unsubscribe Application"
          confirmText={curSubscription.application_name}
          targetText="the application name"
          alertProps={{
            message:
              'After unsubscribing, this application will no longer be able to access this API product.',
          }}
          {...unsubscribeDisclosure}
          onOk={handleUnsubscribe}
        />
      )}
    </>
  );
};

export default ProductSubscriptions;
