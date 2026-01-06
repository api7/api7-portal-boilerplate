import { Divider } from 'antd';

import TimeFormatWithPrefix from '@/components/slices/time-format/TimeFormatWithPrefix';

export type TimeProps = {
  created_at?: Date | number;
  updated_at?: Date | number;
  isLoading?: boolean;
};

export const Time = (props: TimeProps) => {
  const { created_at, updated_at, isLoading } = props;

  return (
    <div className="flex items-center gap-0">
      <Divider
        type="vertical"
        style={{ margin: '0 10px', borderColor: '#E0E0E0' }}
      />
      <TimeFormatWithPrefix
        fromNow
        time={created_at}
        isLoading={isLoading}
        prefix="Created"
      />
      <Divider
        type="vertical"
        style={{ margin: '0 10px', borderColor: '#E0E0E0' }}
      />
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

