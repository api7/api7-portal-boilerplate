import type { FC, ReactNode } from 'react';

import type { PaginationProps } from '@/components/ui/paginate';

export type CardItemProps<T> = {
  reload: () => void;
  isLoading: boolean;
} & T;

export type CardListProps<T extends object> = {
  CardItem: FC<CardItemProps<T>>;
  data?: T[];
  isLoading: boolean;
  isValidating?: boolean;
  title?: string;
  extra?: ReactNode;
  toolBar?: ReactNode[];
  helperText?: string | ReactNode;
  showSearch?: boolean;
  defaultSearch?: string;
  className?: string;
  onParamsChange?: (params: TableParams) => void;
  reload: () => void;
  shouldReset?: boolean;
  text?: {
    noData?: string;
    resetToolTip?: string;
    resetButton?: string;
    searchPlaceholder?: string;
  };
  skeletonCount?: number;
} & (
  | {
      showPagination: true;
      pagination?: undefined;
    }
  | {
      showPagination?: false;
      pagination: {
        page: number;
        pageSize: number;
        total?: number;
        goToPage: (pageIndex: number) => void;
      } & Partial<Pick<PaginationProps, 'text'>>;
    }
);
