import { type FC, type ReactNode, useMemo } from 'react';

import { CheckIcon, CopyIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useClipboard } from '@/lib/hooks/useClipboard';

const CopyButton: FC<{ content: string }> = ({ content }) => {
  const { hasCopied, onCopy } = useClipboard(content);
  return (
    <Button
      className={cn('ml-1')}
      size="icon-xs"
      variant="outline"
      aria-label={hasCopied ? 'Copied' : 'Copy'}
      onClick={onCopy}
    >
      {hasCopied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
};

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
      <CopyButton content={id} />
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
          <PopoverContent align="center" side="top" className="w-auto text-xl">
            {IDList}
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
};
