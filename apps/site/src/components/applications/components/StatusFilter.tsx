import type { ColumnDef } from '@tanstack/react-table';

import A7Label from '@/components/api7/api7-label';
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

type StatusConfig = Record<string, { color: string; text: string; value: string }>;

type StatusDisplayProps = {
  status: SubscriptionStatus;
  statusConfig: StatusConfig;
};

const StatusDisplay = ({ status, statusConfig }: StatusDisplayProps) => {
  const config = statusConfig[status];
  if (!config) return null;
  return (
    <div className="w-fit">
      <A7Label isStatus color={config.color}>
        {config.text}
      </A7Label>
    </div>
  );
};

export function statusCol<T>(statusConfig: StatusConfig): ColumnDef<T> {
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
  } as ColumnDef<T>;
}
