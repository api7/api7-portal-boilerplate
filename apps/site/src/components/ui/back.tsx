import { Button } from 'antd';

import { BareIconImage } from './icon-image';
import { cn } from '@/lib/utils';

type BackProps = Pick<React.HTMLAttributes<HTMLDivElement>, 'className'> & {
  onClick?: () => void;
};

const Back: React.FC<BackProps> = (props) => {
  const { className, onClick } = props;

  return (
    <div className={cn('mb-2', className)}>
      <Button
        variant="text"
        size="small"
        color="default"
        className="gap-1"
        onClick={() => {
          if (onClick) return onClick();
          history.back();
        }}
        icon={
          <BareIconImage
            src="/icons/arrow.svg"
            size={10}
            className="rotate-180 mr-1"
            alt="arrow"
          />
        }
      >
        Back
      </Button>
    </div>
  );
};

export default Back;
