import type { RowData } from '@tanstack/react-table';

import type { DataTableColumnDef } from '@/components/base/data-table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const tableColDesc = <T extends RowData>(
  param: DataTableColumnDef<T>,
): DataTableColumnDef<T> =>
  ({
    ...param,
    cell: ({ getValue }) => {
      const desc = getValue() as string | undefined;
      if (!desc) return null;
      return (
        <Tooltip>
          <TooltipTrigger
            render={
              <span tabIndex={0} className="block truncate max-w-xs">
                {desc}
              </span>
            }
          />
          <TooltipContent>
            <p>{desc}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
  }) as DataTableColumnDef<T>;
