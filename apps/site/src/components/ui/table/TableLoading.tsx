import { memo } from 'react';

import { useDebounce } from 'ahooks';

import { cn } from '@/lib/utils';

type TableLoadingProps = {
  isOpen: boolean;
} & React.HTMLAttributes<HTMLDivElement>;
const TableLoading = (props: TableLoadingProps) => {
  const { isOpen, ...rootProps } = props;
  // To prevent the loading animation from flickering frequently,
  // it will only be displayed if the loading time exceeds 100 ms
  const debouncedLoading = useDebounce(isOpen, { wait: 100 });
  if (!debouncedLoading) return null;

  return (
    <div
      {...rootProps}
      className={cn(
        'w-full h-full absolute z-10 flex items-center justify-center non-scaling-stroke',
        rootProps.className
      )}
    >
      <div className="loading loading-spinner loading-lg "></div>
    </div>
  );
};

export default memo(TableLoading);
