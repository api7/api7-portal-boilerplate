import { type FC, type ReactNode, useMemo } from 'react';

import { Button, Popover } from 'antd';

import { CopyBtn } from '@/components/api-hub/CopyBtn';

export type IDProps = {
  id: string;
  style?: React.CSSProperties;
  label?: ReactNode;
};

export const ID: FC<IDProps> = (props) => {
  const { id, style, label } = props;
  return (
    <div
      className="text-sm text-primary-content font-normal flex items-center"
      style={style}
    >
      <div>
        <div className="font-medium mr-1 inline-block">{label ?? 'ID'}:</div>{' '}
        {id}
      </div>
      <CopyBtn content={id}></CopyBtn>
    </div>
  );
};

export type ViewIDProps = {
  data: {
    id: string;
    label?: ReactNode;
  }[];
  viewText?: string;
};

export const ViewID: FC<ViewIDProps> = (props) => {
  const { data, viewText = 'View ID' } = props;
  const IDList = useMemo(
    () =>
      data.map((item, index) => (
        <ID
          key={item.id}
          id={item.id}
          label={item.label}
          style={{ marginBottom: index === data.length - 1 ? '0' : '8px' }}
        />
      )),
    [data]
  );

  return (
    <div className="flex items-center justify-center">
      {data?.length > 0 ? (
        <Popover content={IDList} trigger="click">
          <Button type="link" className="p-0.5 h-5 text-xs leading-none">
            {viewText}
          </Button>
        </Popover>
      ) : null}
    </div>
  );
};

