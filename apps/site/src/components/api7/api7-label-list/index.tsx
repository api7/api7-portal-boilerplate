import React, { useMemo } from 'react';

import { Tooltip, Typography, type TagProps } from 'antd';
import type { TextProps } from 'antd/es/typography/Text';
import Select, {
  type StylesConfig,
  components,
  type OptionProps,
} from 'react-select';

import A7Label from '../api7-label';
import { BareIconImage } from '@/components/ui-legacy/icon-image';
import { cn } from '@/lib/utils';

export type Options = {
  label: string;
  value: string | number;
  [key: string]: any;
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
    backgroundColor: '#F7F7F7',
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

const Input: React.FC<any> = ({ ...props }) => (
  <components.Input {...props} readOnly />
);

const MultiValueRemove = () => null;
const IndicatorSeparator = () => null;

const DropdownIndicator = (props: any) => (
  <components.DropdownIndicator {...props}>
    <A7Label className="bg-slate-100 leading-none">
      <BareIconImage src="/icons/chevron-down.svg" size={20} />
    </A7Label>
  </components.DropdownIndicator>
);

export type OptionWithColor = Options & {
  color?: TagProps['color'];
};

type LabelListProps = {
  color?: TagProps['color'];
  limitCount: number;
  data: string[] | OptionWithColor[];
  asLabel?: boolean;
  labelOption?: TagWrapperProps;
};

type TagWrapperProps = TagProps & { textProps?: TextProps };

const TagWrapper = (props: TagWrapperProps) => {
  const { children, color = 'blue', textProps, className, ...rest } = props;
  return (
    <A7Label
      className={cn('mr-1 max-w-full align-middle', className)}
      color={color as string}
      {...rest}
    >
      <Tooltip placement="top" arrow title={children}>
        <Typography.Text
          ellipsis
          {...textProps}
          className={cn(
            'max-w-full text-current text-[length:inherit]',
            textProps?.className
          )}
        >
          {children}
        </Typography.Text>
      </Tooltip>
    </A7Label>
  );
};
const A7LabelList: React.FC<LabelListProps> = ({
  color,
  limitCount,
  data = [],
  asLabel = true,
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

    if (asLabel) {
      return (
        <components.Option {...rest}>
          <A7Label color={(data?.color as string) || (color as string)}>
            {data?.color ? data.label : children}
          </A7Label>
        </components.Option>
      );
    }
    return (
      <Typography.Text
        ellipsis
        className="min-h-10 leading-5 px-4 py-[10px] text-current text-[length:inherit] select-all"
      >
        {children}
      </Typography.Text>
    );
  };

  return listData.length ? (
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
          color={(item?.color || color || labelOption?.color) as string}
        >
          {item.label}
        </TagWrapper>
      ))}
    </>
  );
};

export default A7LabelList;
