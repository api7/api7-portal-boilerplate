import A7Label from '@/components/api7/api7-label';
import { useTableColWithFilterOption } from '@/components/slices/table-col/labels';
import type { SubscriptionStatus } from '@/types/portal-sdk';

export const PRODUCT_STATUS_CONFIG = {
  subscribed: {
    color: 'green',
    text: 'Subscribed',
    label: 'Subscribed',
    value: 'subscribed',
  },
  wait_for_approval: {
    color: 'gray',
    text: 'Wait For Approval',
    label: 'Wait For Approval',
    value: 'wait_for_approval',
  },
  unsubscribed: {
    color: 'gray',
    text: 'Unsubscribed',
    label: 'Unsubscribed',
    value: 'unsubscribed',
  },
} as const;

type Props = {
  status: SubscriptionStatus;
  statusConfig: Record<
    string,
    { color: string; text: string; label: string; value: string }
  >;
};

const StatusDisplay = (props: Props) => {
  const { status, statusConfig } = props;
  const config = statusConfig[status];
  return (
    <div className="w-fit">
      <A7Label isStatus color={config.color}>
        {config.text}
      </A7Label>
    </div>
  );
};

export const useStatusCol = <T,>(
  props: {
    onParamsChange: (params: object) => void;
  } & Pick<Props, 'statusConfig'>
) => {
  const { onParamsChange, statusConfig } = props;
  const statusFilters = Object.values(statusConfig).map((config) => ({
    text: config.label,
    value: config.value,
  }));

  const statusCol = useTableColWithFilterOption<T>({
    title: 'Status',
    dataIndex: 'status',
    render: (status: SubscriptionStatus) => (
      <StatusDisplay status={status} statusConfig={statusConfig} />
    ),
    onParamsChange,
    filters: statusFilters,
    hideKey: true,
  });

  return statusCol;
};
