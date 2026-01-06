import { cn } from '@/lib/utils';

const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        'h-full rounded relative overflow-hidden bg-gray-200/50 before:absolute before:inset-0 before:w-[200%] before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-gray-300 dark:before:via-gray-700 before:to-transparent before:isolate',
        className
      )}
      {...props}
    />
  );
};

export { Skeleton };
