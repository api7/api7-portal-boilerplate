'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useCreation } from 'ahooks';
import { EllipsisVerticalIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import TimeFormat from '@/components/slices/time-format';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/base/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCanManageApplications } from '@/lib/auth/useApplicationPermission';
import { useApiHubBasePath } from '@/lib/hooks/useApiHubBasePath';
import useDisclosure from '@/lib/hooks/useDisclosure';
import useSubscriptionList from '@/lib/query/useSubscriptionList';
import type { SubscriptionItem } from '@/types/portal-sdk';

import { PRODUCT_STATUS_CONFIG, statusCol } from './StatusFilter';
import SubscribeAPIProductModal from './SubscribeAPIProductModal';
import UnsubscribeModal from './UnsubscribeModal';

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
      <Button disabled={disabled} onClick={subscribeDisclosure.setOpen}>
        <PlusIcon />
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
  const req = useSubscriptionList({ application_id: id });

  const unsubscribeDisclosure = useDisclosure();
  const [curSubscription, setCurSubscription] = useState<SubscriptionItem | null>();

  const columns = useCreation<ColumnDef<SubscriptionItem>[]>(
    () => [
      {
        header: 'API Product',
        accessorKey: 'api_product_name',
        cell: ({ row }) => (
          <Link
            href={`${apiHubBasePath}/${row.original.api_product_id}`}
            target="_blank"
            className="text-primary hover:underline text-sm font-medium"
          >
            {row.original.api_product_name}
          </Link>
        ),
      },
      statusCol<SubscriptionItem>(PRODUCT_STATUS_CONFIG),
      {
        header: 'Subscribed',
        accessorKey: 'subscribed_at',
        cell: ({ getValue }) => {
          const timestamp = getValue() as number;
          if (!timestamp) return 'Not yet';
          return <TimeFormat time={timestamp} fromNow />;
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
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
                    setCurSubscription(row.original);
                    unsubscribeDisclosure.setOpen();
                  }}
                >
                  <Trash2Icon />
                  Unsubscribe
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [apiHubBasePath, canManageApplications],
  );

  return (
    <>
      <DataTable
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
