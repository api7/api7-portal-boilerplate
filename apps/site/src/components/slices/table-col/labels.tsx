import type { ColumnDef } from '@tanstack/react-table';

import A7LabelList from '@/components/api7/api7-label-list';

export const tableColLabels = <T,>(param: ColumnDef<T>): ColumnDef<T> => ({
  enableSorting: false,
  ...param,
  cell: ({ getValue }) => {
    const data = getValue() as Record<string, string> | undefined;
    return (
      <A7LabelList
        color="blue"
        limitCount={3}
        data={Object.keys(data || {}).map((k) => `${k}:${data![k]}`)}
      />
    );
  },
} as ColumnDef<T>);
