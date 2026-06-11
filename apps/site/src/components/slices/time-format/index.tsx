import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { absoluteTimeFormat } from './constant';

dayjs.extend(relativeTime);

type Props = {
  time: dayjs.ConfigType;
  format?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const defaultClassName =
  'min-w-[152px] border-b-[1px] border-dashed border-[#c0c7d8]';
const TimeFormatFromNow = ({ time, format, ...divProps }: Props) => (
  <Tooltip>
    <TooltipTrigger delay={0}>
      <span {...divProps} className={cn(defaultClassName, divProps.className)}>
        {dayjs(time).fromNow()}
      </span>
    </TooltipTrigger>
    <TooltipContent>
      <p className="text-sm">
        {dayjs(time).format(format || absoluteTimeFormat)}
      </p>
    </TooltipContent>
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
