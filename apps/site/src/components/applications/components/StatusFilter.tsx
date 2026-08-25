import type { RowData } from '@tanstack/react-table';

import type { DataTableColumnDef } from '@/components/base/data-table';
import type { SubscriptionStatus } from '@/types/portal-sdk';
import { StatusDisplay, type StatusConfig } from './StatusDisplay';

export const PRODUCT_STATUS_CONFIG = {
  subscribed: {
    color: 'green',
    text: 'Subscribed',
    value: 'subscribed',
  },
  wait_for_approval: {
    color: 'orange',
    text: 'Wait For Approval',
    value: 'wait_for_approval',
  },
  unsubscribed: {
    color: 'gray',
    text: 'Unsubscribed',
    value: 'unsubscribed',
  },
} as const;

export function statusCol<T extends RowData>(
  statusConfig: StatusConfig,
): DataTableColumnDef<T> {
  return {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    enableSorting: false,
    cell: ({ getValue }) => (
      <StatusDisplay
        status={getValue() as SubscriptionStatus}
        statusConfig={statusConfig}
      />
    ),
  } as DataTableColumnDef<T>;
}
