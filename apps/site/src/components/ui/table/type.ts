import type { TableProps as AntdTableProps } from 'antd';
import type { AnyObject } from 'antd/es/_util/type';
import type { ColumnsType } from 'antd/es/table/interface';

import type { PaginationProps } from '../paginate';
import type { WithSavePage } from '@/types/utils';

export type TableProps<T extends AnyObject, P = object> = {
  columns: ColumnsType<T>;
  data?: readonly AnyObject[];
  isLoading: boolean;
  isValidating?: boolean;
  extra?: React.ReactNode;
  toolBar?: React.ReactNode[];
  prefixToolBar?: React.ReactNode[];
  helperText?: React.ReactNode;
  nameSearch?: boolean;
  nameSearchInputProps?: React.HTMLAttributes<HTMLParagraphElement>;
  className?: string;
  onParamsChange: (params: P) => void;
  refetch: () => void;
  shouldReset?: boolean;
  customResetStatus?: boolean;
  customReset?: () => void;
  serverSort?: boolean;
  queryForm?: React.ReactNode;
  hiddenColumns?: string[];
  alert?: React.ReactNode;
  headerStyle?: React.HTMLAttributes<HTMLDivElement>;
  containerStyle?: React.HTMLAttributes<HTMLDivElement>;
  headerFlexProps?: React.HTMLAttributes<HTMLDivElement>;
  options?: AntdTableProps<T>;
  text?: {
    noData?: string;
    resetToolTip?: string;
    resetButton?: string;
    searchPlaceholder?: string;
    filterByLabels?: string;
  };
} & (
  | {
      hidePagination: true;
      pagination?: undefined;
    }
  | {
      hidePagination?: false;
      pagination: {
        pageIndex: number;
        pageSize: number;
        total?: number;
        goToPage: (pageIndex: number) => void;
      } & Partial<Pick<PaginationProps, 'text'>>;
    }
) &
  WithSavePage;
