import { memo } from 'react';

import { useCreation } from 'ahooks';
import { Image, Tooltip } from 'antd';
import { Fragment } from 'react/jsx-runtime';

import { cn } from '@/lib/utils';

type Props = React.PropsWithChildren & {
  label?: React.ReactNode;
  tooltip?: string;
  optional?: boolean;
  isChunk?: boolean;
  custom?: React.ReactNode;
  showChildren?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export type FormItemBoxProps = Props;

const ChunkWrapper = ({ children }: React.PropsWithChildren) => (
  <div
    className="text-sm px-4 py-3 rounded border border-solid border-base-300 shadow-inner border-l-1 border-l-blue-100 last:mb-0"
    style={{ boxShadow: '2px 0px 0px 0px #D6EAFF inset' }}
  >
    {children}
  </div>
);

const BoxLabel = ({ children }: React.PropsWithChildren) => (
  <label className="block mr-4 mb-2 text-start text-sm font-medium leading-5">
    {children}
  </label>
);

const FormItemBox = (props: Props) => {
  const {
    label,
    tooltip,
    optional,
    isChunk = true,
    custom,
    children,
    showChildren = true,
    ...rootProps
  } = props;
  const Wrapper = useCreation(
    () => (isChunk ? ChunkWrapper : Fragment),
    [isChunk]
  );

  return (
    <div className={cn(isChunk && 'w-full mb-6')} {...rootProps}>
      <div className="flex justify-between">
        <div className="flex">
          {label && (
            <BoxLabel>
              {label}
              {optional && (
                <span className="text-base-content">{' (Optional)'}</span>
              )}
            </BoxLabel>
          )}
          {tooltip && (
            <Tooltip
              arrow
              title={tooltip}
              placement="top"
              className="bg-primary-content"
            >
              <Image
                src="/icons/info.svg"
                preview={false}
                className="ml-1 size-[14px]"
                data-cy="labelTooltip"
              />
            </Tooltip>
          )}
        </div>
        {custom}
      </div>
      {showChildren && <Wrapper>{children}</Wrapper>}
    </div>
  );
};

export default memo(FormItemBox);
