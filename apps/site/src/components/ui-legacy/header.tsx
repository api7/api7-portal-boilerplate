import { cn } from '@/lib/utils';

type HeaderProps = {
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
  titleProps?: React.HTMLAttributes<HTMLDivElement>;
  title: React.ReactNode;
  afterTitle?: React.ReactNode;
  desc?: React.ReactNode;
  descProps?: React.HTMLAttributes<HTMLDivElement>;
} & React.HTMLAttributes<HTMLDivElement>;
const Header = (props: HeaderProps) => {
  const { wrapperProps, titleProps, title, desc, descProps, ...rootProps } =
    props;
  return (
    <div
      {...rootProps}
      className={cn('flex justify-between w-full gap-3', rootProps?.className)}
    >
      <div
        {...wrapperProps}
        className={cn(
          'flex flex-col justify-center w-full min-h-8 space-y-1.5',
          wrapperProps?.className
        )}
      >
        <div
          {...titleProps}
          className={cn(
            'flex gap-2 text-primary-content text-lg font-semibold leading-none w-full',
            titleProps?.className
          )}
        >
          {title}
          {props?.afterTitle}
        </div>
        {desc && (
          <div
            {...descProps}
            className={cn('text-xs text-neutral-content', descProps?.className)}
          >
            {desc}
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
