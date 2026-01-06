import { Tooltip } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { absoluteTimeFormat } from './constant';
import { cn } from '@/lib/utils';

dayjs.extend(relativeTime);

type Props = {
  time: dayjs.ConfigType;
  format?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const defaultClassName =
  'min-w-[152px] border-b-[1px] border-dashed border-[#c0c7d8]';
const TimeFormatFromNow = ({ time, format, ...divProps }: Props) => (
  <Tooltip
    arrow
    title={dayjs(time).format(format || absoluteTimeFormat)}
    placement="top"
  >
    <span {...divProps} className={cn(defaultClassName, divProps.className)}>
      {dayjs(time).fromNow()}
    </span>
  </Tooltip>
);

const TimeFormatNormal = ({ time, format, ...divProps }: Props) => (
  <div {...divProps} className={cn(defaultClassName, divProps.className)}>
    {dayjs(time).format(format || absoluteTimeFormat)}
  </div>
);

const TimeFormat = (props: Props & { fromNow?: boolean }) => {
  const { fromNow = false, time: t, format, ...boxProps } = props;

  if (!t) {
    return null;
  }

  // we only support unix timestamp
  const time = typeof t === 'number' ? t * 1000 : t;

  return fromNow ? (
    <TimeFormatFromNow {...{ time, format, ...boxProps }} />
  ) : (
    <TimeFormatNormal {...{ time, format, ...boxProps }} />
  );
};

export default TimeFormat;

