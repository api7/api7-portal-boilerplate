import { memo } from 'react';

import { useDebounce } from 'ahooks';

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
      <div className="loading loading-spinner loading-lg" />
    </div>
  );
};

export default memo(TableLoading);
