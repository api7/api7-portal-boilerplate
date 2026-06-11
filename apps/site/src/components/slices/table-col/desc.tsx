import type { ColumnDef } from '@tanstack/react-table';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const tableColDesc = <T,>(param: ColumnDef<T>): ColumnDef<T> => ({
  ...param,
  cell: ({ getValue }) => {
    const desc = getValue() as string;
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="block truncate max-w-xs">{desc}</span>} />
        <TooltipContent>
          <p>{desc}</p>
        </TooltipContent>
      </Tooltip>
    );
  },
} as ColumnDef<T>);
