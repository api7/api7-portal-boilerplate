import type { ColumnDef } from '@tanstack/react-table';

import { BadgeList } from '@/components/base/badge-list';

export const tableColLabels = <T,>(param: ColumnDef<T>): ColumnDef<T> => ({
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
} as ColumnDef<T>);
