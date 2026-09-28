'use client';

import TimeFormatWithPrefix from '@/components/slices/time-format/TimeFormatWithPrefix';
import { Separator } from '@/components/ui/separator';

export type TimeProps = {
  created_at?: Date | number;
  updated_at?: Date | number;
  isLoading?: boolean;
};

export const Time = (props: TimeProps) => {
  const { created_at, updated_at, isLoading } = props;

  return (
    <div className="flex items-center gap-0">
      <Separator orientation="vertical" className="mx-[10px]" />
      <TimeFormatWithPrefix
        fromNow
        time={created_at}
        isLoading={isLoading}
        prefix="Created"
      />
      <Separator orientation="vertical" className="mx-[10px]" />
      <TimeFormatWithPrefix
        fromNow
        time={updated_at}
        isLoading={isLoading}
        prefix="Updated"
      />
    </div>
  );
};

export default Time;
