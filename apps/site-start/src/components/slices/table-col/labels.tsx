import type { RowData } from '@tanstack/react-table';

import { BadgeList } from '@/components/base/badge-list';
import type { DataTableColumnDef } from '@/components/base/data-table';

export const tableColLabels = <T extends RowData>(
  param: DataTableColumnDef<T>,
): DataTableColumnDef<T> =>
  ({
    enableSorting: false,
    ...param,
    cell: ({ getValue }) => {
      const data = getValue() as Record<string, string> | undefined;
      return (
        <BadgeList
          limitCount={3}
          data={Object.keys(data || {}).map((k) => `${k}:${data![k]}`)}
        />
      );
    },
  }) as DataTableColumnDef<T>;
