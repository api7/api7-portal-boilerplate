import { Tooltip } from 'antd';
import type { ColumnType } from 'antd/es/table';

export const tableColDesc = <T extends unknown>(
  param: Partial<ColumnType<T>>
): ColumnType<T> => ({
  ellipsis: {
    showTitle: false,
  },
  render: (desc: string) => (
    <Tooltip placement="topLeft" title={desc}>
      {desc}
    </Tooltip>
  ),
  ...param,
});

