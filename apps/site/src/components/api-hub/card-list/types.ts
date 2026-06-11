import type { FC, ReactNode } from 'react';

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
  searchPrefix?: ReactNode;
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
        text?: { results?: string; of?: string };
      };
    }
);
