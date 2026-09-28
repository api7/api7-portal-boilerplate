import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useCreation } from 'ahooks';
import { EllipsisVerticalIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  DataTable,
  type DataTableColumnDef,
} from '@/components/base/data-table';
import ValidateModal from '@/components/slices/modal/ValidateModal';
import TimeFormat from '@/components/slices/time-format';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PATH_APPLICATIONS } from '@/constants/path-prefix';
import { useCanManageApplications } from '@/lib/auth/useApplicationPermission';
import { unsubscribe } from '@/lib/dal/subscriptions';
import useDisclosure from '@/lib/hooks/useDisclosure';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import useSubscriptionList from '@/lib/query/useSubscriptionList';
import type { SubscriptionItem } from '@/types/portal-sdk';
import {
  PRODUCT_STATUS_CONFIG,
  statusCol,
} from '../../applications/components/StatusFilter';
import SubscribeAPIProductApplicationModal from '../../applications/components/SubscribeAPIProductApplicationModal';

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
      <Button disabled={disabled} onClick={subscribeDisclosure.setOpen}>
        <PlusIcon />
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

const ProductSubscriptions = ({ id }: { id: string }) => {
  const productId = id;
  const orgSlug = useOrganizationSlug();
  const { canManageApplications } = useCanManageApplications();
  const unsubscribeMutation = useMutation({
    mutationFn: unsubscribe,
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to unsubscribe application',
      );
    },
  });

  const req = useSubscriptionList({ api_product_id: productId });

  const unsubscribeDisclosure = useDisclosure();
  const [curSubscription, setCurSubscription] =
    useState<SubscriptionItem | null>();

  const columns = useCreation<DataTableColumnDef<SubscriptionItem>[]>(
    () => [
      {
        header: 'Application',
        accessorKey: 'application_name',
        cell: ({ row }) => {
          if (!orgSlug) return row.original.application_name;
          const href: string = `/${orgSlug}${PATH_APPLICATIONS}/${row.original.application_id}`;
          return (
            <Link
              to={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              {row.original.application_name}
            </Link>
          );
        },
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
    [orgSlug, canManageApplications],
  );

  const handleUnsubscribe = () => {
    if (!curSubscription?.id || !orgSlug) return;

    return unsubscribeMutation
      .mutateAsync({
        data: {
          organizationSlug: orgSlug,
          subscriptionId: curSubscription.id,
        },
      })
      .then(() => {
        req.refetch();
        toast.success('Unsubscribed application successfully');
        unsubscribeDisclosure.onClose();
      })
      .catch(() => {});
  };

  return (
    <>
      <DataTable
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
            description:
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
