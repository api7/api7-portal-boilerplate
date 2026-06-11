// ui legacy
import React, { useMemo } from 'react';
import Select, {
  type DropdownIndicatorProps,
  type InputProps,
  type OptionProps,
  type StylesConfig,
  components,
} from 'react-select';

import { ChevronDownIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import A7Label from '../api7-label';

export type Options = {
  label: string;
  value: string | number;
  [key: string]: unknown;
} | null;

const style: StylesConfig = {
  clearIndicator: (provided) => ({
    ...provided,
    display: 'none',
  }),
  control: (provided) => ({
    ...provided,
    border: 'none',
    boxShadow: 'none',
    justifyContent: 'flex-start',
    backgroundColor: 'unset',
    minHeight: '24px',
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    border: 'none',
    cursor: 'pointer',
  }),
  valueContainer: (provided) => ({
    ...provided,
    flexWrap: 'nowrap',
    overflowX: 'auto',
    padding: 'unset',
  }),
  option: (provided) => ({
    ...provided,
    backgroundColor: 'var(--color-muted)',
  }),
  menu: (provided) => ({
    ...provided,
    width: 'unset',
    minWidth: '230px',
    alignItems: 'end',
    margin: 0,
    borderRadius: '2px',
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 0,
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    minHeight: '24px',
  }),
};

const Input = (props: InputProps) => (
  <components.Input {...props} readOnly />
);

const MultiValueRemove = () => null;
const IndicatorSeparator = () => null;

const DropdownIndicator = (props: DropdownIndicatorProps) => (
  <components.DropdownIndicator {...props}>
    <A7Label className="bg-muted leading-none">
      <ChevronDownIcon className="size-5" />
    </A7Label>
  </components.DropdownIndicator>
);

type Color = 'default' | 'blue';

export type OptionWithColor = Options & {
  color?: Color;
};

type LabelListProps = {
  color?: Color;
  limitCount: number;
  data: string[] | OptionWithColor[];
  labelOption?: TagWrapperProps;
};

type TagWrapperProps = {
  textProps?: React.HTMLAttributes<HTMLParagraphElement>;
  color?: Color;
  children?: React.ReactNode;
  className?: string;
};

const TagWrapper = (props: TagWrapperProps) => {
  const { children, color = 'blue', textProps, className, ...rest } = props;
  return (
    <A7Label
      className={cn('mr-1 max-w-full align-middle', className)}
      color={color as string}
      {...rest}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <p
              {...textProps}
              className={cn(
                'max-w-full text-current text-[length:inherit] text-left',
                textProps?.className,
              )}
            >
              {children}
            </p>
          }
        />
        <TooltipContent side="top">
          <small className="text-sm leading-none font-medium">{children}</small>
        </TooltipContent>
      </Tooltip>
    </A7Label>
  );
};
const A7LabelList: React.FC<LabelListProps> = ({
  color,
  limitCount,
  data = [],
  labelOption,
}) => {
  const labelData = useMemo<OptionWithColor[]>(() => {
    if (typeof data[0] === 'object') {
      return data.slice(0, limitCount) as OptionWithColor[];
    }
    return data.slice(0, limitCount).map((item) => ({
      label: item,
      value: item,
    })) as OptionWithColor[];
  }, [data, limitCount]);

  const listData = useMemo(() => {
    if (typeof data[0] === 'object') {
      return data.slice(limitCount, data.length) as OptionWithColor[];
    }
    return data.slice(limitCount, data.length).map((item) => ({
      label: item,
      value: item,
    })) as OptionWithColor[];
  }, [data, limitCount]);
  const MultiValueContainer: React.FC<{ data: OptionWithColor }> = (state) => {
    const { data } = state;
    return (
      <TagWrapper textProps={{ className: 'w-10' }} {...data}>
        {data.label}
      </TagWrapper>
    );
  };

  const Option: React.FC<OptionProps> = ({ children, ...rest }) => {
    const { data } = rest as { data: OptionWithColor };

    return (
      <components.Option {...rest}>
        <A7Label color={(data?.color as string) || (color as string)}>
          {data?.color ? data.label : children}
        </A7Label>
      </components.Option>
    );
  };

  return (
    <TooltipProvider>
      {listData.length ? (
        <Select
          isMulti
          value={labelData}
          options={listData}
          menuPosition="fixed"
          styles={style}
          components={{
            MultiValueContainer,
            Input,
            MultiValueRemove,
            IndicatorSeparator,
            DropdownIndicator,
            Option,
          }}
        />
      ) : (
        <>
          {labelData.map((item) => (
            <TagWrapper
              key={item.value}
              {...labelOption}
              color={(item?.color || color || labelOption?.color) as Color}
            >
              {item.label}
            </TagWrapper>
          ))}
        </>
      )}
    </TooltipProvider>
  );
};

export default A7LabelList;
