import { StatusBadge } from '@/components/base/status-badge';
import type { SubscriptionStatus } from '@/types/portal-sdk';

export type StatusConfig = Record<
  string,
  { color: string; text: string; value: string }
>;

type StatusDisplayProps = {
  status: SubscriptionStatus;
  statusConfig: StatusConfig;
};

export const StatusDisplay = ({ status, statusConfig }: StatusDisplayProps) => {
  const config = statusConfig[status];
  if (!config) return null;
  return (
    <div className="w-fit">
      <StatusBadge color={config.color}>{config.text}</StatusBadge>
    </div>
  );
};
