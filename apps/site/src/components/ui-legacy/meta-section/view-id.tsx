import { type FC, type ReactNode, useMemo } from 'react';

import { CopyButton } from '@/components/api-hub/CopyButton';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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
      <CopyButton content={id}></CopyButton>
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
    [data],
  );

  return (
    <div className="flex items-center justify-center">
      {data?.length > 0 ? (
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="link" className="p-0.5 h-5 text-xs leading-none">
                {viewText}
              </Button>
            }
          />
          <PopoverContent align="center" side="top" className="w-100 text-xl">
            {IDList}
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
};
