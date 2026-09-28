import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type BackProps = Pick<React.HTMLAttributes<HTMLDivElement>, 'className'> & {
  onClick?: () => void;
};

const Back: React.FC<BackProps> = (props) => {
  const { className, onClick } = props;

  return (
    <div className={cn('mb-2', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1"
        onClick={() => {
          if (onClick) return onClick();
          history.back();
        }}
      >
        <ArrowLeftIcon />
        Back
      </Button>
    </div>
  );
};

export default Back;
