import type { RowData } from '@tanstack/react-table';

import type { DataTableColumnDef } from '@/components/base/data-table';
import { StatusBadge } from '@/components/base/status-badge';
import type { SubscriptionStatus } from '@/types/portal-sdk';

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

type StatusConfig = Record<
  string,
  { color: string; text: string; value: string }
>;

type StatusDisplayProps = {
  status: SubscriptionStatus;
  statusConfig: StatusConfig;
};

const StatusDisplay = ({ status, statusConfig }: StatusDisplayProps) => {
  const config = statusConfig[status];
  if (!config) return null;
  return (
    <div className="w-fit">
      <StatusBadge color={config.color}>{config.text}</StatusBadge>
    </div>
  );
};

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
