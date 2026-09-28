import { memo } from 'react';

import { useDebounce } from 'ahooks';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type TableLoadingProps = {
  isOpen: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

const TableLoading = ({ isOpen, ...rootProps }: TableLoadingProps) => {
  const debouncedLoading = useDebounce(isOpen, { wait: 100 });
  if (!debouncedLoading) return null;

  return (
    <div
      {...rootProps}
      className={cn(
        'w-full h-full absolute z-10 flex items-center justify-center non-scaling-stroke',
        rootProps.className,
      )}
    >
      <Spinner className="size-8" />
    </div>
  );
};

export default memo(TableLoading);
