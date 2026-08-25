'use client';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@api7/portal-ui/components/ui/input-group';
import { Skeleton } from '@api7/portal-ui/components/ui/skeleton';
import { Spinner } from '@api7/portal-ui/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@api7/portal-ui/components/ui/table';
import {
  type ColumnDef,
  type RowData,
  type SortingState,
  flexRender,
  useTable,
} from '@tanstack/react-table';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { dataTableFeatures } from './features';
import DataTablePagination, {
  type DataTablePaginationProps,
} from './pagination';

export type DataTableColumnDef<T extends RowData> = ColumnDef<
  typeof dataTableFeatures,
  T
>;

type PaginationConfig = Omit<DataTablePaginationProps, 'onPageSizeChange'>;

type DataTableProps<T extends RowData, P = object> = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange'
> & {
  columns: DataTableColumnDef<T>[];
  data?: T[];
  isLoading: boolean;
  isValidating?: boolean;
  toolBar?: React.ReactNode[];
  leadingToolBar?: React.ReactNode;
  nameSearch?: boolean;
  defaultSearch?: string;
  defaultSorting?: SortingState;
  text?: { searchPlaceholder?: string; noData?: string };
  onParamsChange: (params: P) => void;
  refetch?: () => void;
  getRowId?: (row: T) => string;
  isError?: boolean;
} & (
    | { hidePagination: true; pagination?: undefined; savePage?: undefined }
    | {
        hidePagination?: false;
        savePage?: boolean;
        pagination: PaginationConfig;
      }
  );

function defaultRowId<T extends RowData>(row: T): string {
  const r = row as Record<string, unknown>;
  return String(r.id ?? r.key ?? r.name ?? r.slug ?? JSON.stringify(row));
}

export function DataTable<T extends RowData, P = object>({
  columns,
  data = [],
  isLoading,
  isValidating = false,
  isError: _isError,
  toolBar = [],
  leadingToolBar,
  nameSearch = false,
  defaultSearch = '',
  defaultSorting = [],
  text,
  onParamsChange,
  hidePagination,
  pagination,
  refetch: _refetch,
  getRowId,
  className,
  savePage,
  ...rest
}: DataTableProps<T, P>) {
  const resolvedText = {
    searchPlaceholder: 'Search',
    noData: 'No Data',
    ...text,
  };

  const [searchValue, setSearchValue] = useState(defaultSearch);
  const [prevDefaultSearch, setPrevDefaultSearch] = useState(defaultSearch);
  if (prevDefaultSearch !== defaultSearch) {
    setPrevDefaultSearch(defaultSearch);
    setSearchValue(defaultSearch);
  }
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    defaultColumn: { enableSorting: false },
    manualSorting: true,
    sortDescFirst: false,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(next);
      const sort = next[0];
      if (!hidePagination) pagination?.goToPage(0);
      onParamsChange({
        order_by: sort?.id,
        direction: sort ? (sort.desc ? 'desc' : 'asc') : undefined,
      } as P);
    },
    state: { sorting },
    getRowId: getRowId ?? defaultRowId,
  });

  const rows = table.getRowModel().rows;
  const hasToolbar = nameSearch || toolBar.length > 0 || !!leadingToolBar;

  return (
    <div className={cn('mt-4', className)} {...rest}>
      {hasToolbar && (
        <div className="flex items-center gap-2 mb-4">
          {leadingToolBar}
          <div className="flex-1" />
          {nameSearch && (
            <div className="w-[320px]">
              <InputGroup>
                <InputGroupInput
                  placeholder={resolvedText.searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (!hidePagination) pagination?.goToPage(0);
                      onParamsChange({ search: searchValue || undefined } as P);
                    }
                  }}
                />
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                {searchValue && (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label="Clear search"
                      size="icon-xs"
                      onClick={() => {
                        setSearchValue('');
                        if (!hidePagination) pagination?.goToPage(0);
                        onParamsChange({ search: undefined } as P);
                      }}
                    >
                      <XIcon />
                    </InputGroupButton>
                  </InputGroupAddon>
                )}
              </InputGroup>
            </div>
          )}
          {toolBar.map((item, i) => (
            <div key={i}>{item}</div>
          ))}
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-[300px] w-full" />
      ) : (
        <div className="relative rounded-md border">
          {isValidating && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/60">
              <Spinner className="size-6" />
            </div>
          )}
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-muted/50 hover:bg-muted/50"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        header.column.getCanSort()
                          ? header.column.getIsSorted() === 'asc'
                            ? 'ascending'
                            : header.column.getIsSorted() === 'desc'
                              ? 'descending'
                              : 'none'
                          : undefined
                      }
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={header.column.getToggleSortingHandler()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              header.column.toggleSorting();
                            }
                          }}
                          className="flex items-center gap-1 text-xs font-medium text-muted-foreground cursor-pointer select-none"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {header.column.getIsSorted() === 'asc' && (
                            <ArrowUpIcon className="size-3" />
                          )}
                          {header.column.getIsSorted() === 'desc' && (
                            <ArrowDownIcon className="size-3" />
                          )}
                          {!header.column.getIsSorted() && (
                            <ChevronsUpDownIcon className="size-3 opacity-40" />
                          )}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'flex items-center gap-1 text-xs font-medium text-muted-foreground',
                            header.column.id === 'actions' &&
                              'w-full justify-end',
                          )}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {cell.column.id === 'actions' ? (
                          <div className="flex justify-end">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </div>
                        ) : (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-0 h-48">
                    <div className="flex h-full w-full items-center justify-center">
                      <p className="text-xl font-medium text-gray-600">
                        {resolvedText.noData}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {!hidePagination && pagination && (
            <DataTablePagination
              total={pagination.total ?? 0}
              pageIndex={pagination.pageIndex}
              pageSize={pagination.pageSize}
              goToPage={pagination.goToPage}
              onPageSizeChange={(newPageSize) => {
                pagination.goToPage(0);
                onParamsChange({ page_size: newPageSize } as P);
              }}
              savePage={savePage}
              text={pagination.text}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default DataTable;
