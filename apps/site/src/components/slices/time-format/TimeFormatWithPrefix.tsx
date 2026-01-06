import { format } from './constant';
import TimeFormat from './index';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Props = {
  prefix: string;
  time: Date | number | undefined;
  isLoading?: boolean;
  fromNow?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

const TimeFormatWithPrefix = (props: Props) => {
  const { prefix, time, isLoading, fromNow, ...rootProps } = props;
  const len = `${format.length * 6}px`;
  const colon = ': ';

  if (!time) return null;
  return (
    <div
      {...rootProps}
      className={cn('flex text-sm text-gray-500', rootProps.className)}
      data-cy={`product-time-${prefix}`}
    >
      <div className="mr-0.5">{`${prefix}${colon}`}</div>
      {isLoading ? (
        <Skeleton style={{ width: len }} />
      ) : (
        <TimeFormat
          fromNow={fromNow}
          time={time}
          format={format}
          style={{ minWidth: fromNow ? 'auto' : len }}
        />
      )}
    </div>
  );
};

export default TimeFormatWithPrefix;

