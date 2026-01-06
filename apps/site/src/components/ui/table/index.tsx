import { useEffect, useMemo, useState } from 'react';

import { Table, ConfigProvider, Input, Tooltip, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';

import TableEmpty from './TableEmpty';
import TableLoading from './TableLoading';
import type { TableProps } from './type';
import IconImage from '../icon-image';
import { Skeleton } from '../skeleton';
import Pagination from '@/components/ui/paginate';

function wrapOnHeaderCell<T>(cols: ColumnsType<T>) {
  return cols.map((v) => ({
    ...v,
    onHeaderCell: () => ({
      style: {
        padding: '8px 16px',
        fontSize: 12,
        color: '#8A92A6',
        fontWeight: 500,
        backgroundColor: 'rgb(245, 246, 250)',
      },
    }),
    onCell: () => ({
      style: {
        padding: '16px',
        color: '#2C2C2C',
        lineHeight: '175%',
      },
    }),
  }));
}

const defaultText = {
  resetToolTip: 'Reset Filter Conditions',
  resetButton: 'Reset',
  searchPlaceholder: 'Search',
  noData: 'No Data',
  filterByLabels: 'Filter By Labels',
};

const A7Table = <T extends object, P = object>({
  columns,
  data = [],
  isLoading,
  isValidating = false,
  toolBar = [],
  prefixToolBar = [],
  containerStyle = {},
  extra = '',
  nameSearch = false,
  shouldReset = false,
  customResetStatus = false,
  customReset,
  onParamsChange,
  hidePagination,
  pagination,
  refetch = () => {},
  options,
  savePage = true,
  ...rest
}: TableProps<T, P>) => {
  const text = { ...defaultText, ...rest.text };
  const [searchValue, setSearchValue] = useState<string>('');
  const [filterName, setFilterName] = useState<string>('labels');

  // from api7-paginate component
  // Since component re-rendering will lose state, put it here
  const [itemOffset, setItemOffset] = useState(0);

  // auto compute result base on pageIndex
  const pageIndex = !hidePagination ? pagination.pageIndex : 0;
  useEffect(() => {
    setItemOffset(pageIndex * 10);
  }, [pageIndex]);

  useEffect(() => {
    // Reload table data when updating parameters and return to the first page
    onParamsChange?.({ ...(searchValue && { search: searchValue }) } as P);
    refetch();
  }, [filterName]);

  const isResetDisable = useMemo(() => {
    let nameSearchCheck = true;
    if (nameSearch && searchValue.length) {
      nameSearchCheck = false;
    }

    let paginationCheck = true;
    if (!hidePagination && pagination.pageIndex !== 0) {
      paginationCheck = false;
    }

    // These states require the reset button to reset
    return nameSearchCheck && paginationCheck && !customResetStatus;
  }, [columns.length, rest, searchValue, customResetStatus]);

  return (
    <div className={'mt-4'} {...rest}>
      <div>
        <div className="flex justify-end w-full space-x-2">
          {prefixToolBar && (
            <div>
              {prefixToolBar.map((item, index) => (
                <div key={index} className="mr-2 mt-4">
                  {item}
                </div>
              ))}
            </div>
          )}
          {nameSearch && onParamsChange && (
            <div className="relative flex items-center w-[320px]">
              <Input
                className="dark:bg-transparent dark:text-primary-content"
                placeholder={text.searchPlaceholder}
                value={searchValue}
                prefix={<IconImage type="search" size={18} />}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    pagination?.goToPage(0);
                    onParamsChange({ search: searchValue || undefined } as P);
                  }
                }}
              />
            </div>
          )}
          {shouldReset && (
            <div>
              <Tooltip title={text.resetToolTip} arrow placement="top">
                <Button
                  data-cy="table-reset"
                  disabled={isResetDisable}
                  className="text-xs"
                  onClick={() => {
                    setSearchValue('');
                    setFilterName('labels');
                    customReset?.();
                    !hidePagination && pagination.goToPage(0);
                    onParamsChange?.({ search: undefined } as P);
                  }}
                >
                  {text.resetButton}
                </Button>
              </Tooltip>
            </div>
          )}
          {toolBar && (
            <div className="flex">
              {toolBar.map((item, index) => (
                <div key={index}>{item}</div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* TODO: use skeleton like in console */}
      {isLoading && (
        <div className="mt-4 h-[300px] relative">
          <Skeleton />
        </div>
      )}
      <div style={{ ...(isLoading && { display: 'none' }) }}>
        {extra}
        <div className="mt-4" {...containerStyle}>
          <ConfigProvider
            renderEmpty={() => (
              <div className="h-[200px] -m-4">
                <TableEmpty description={text?.noData} />
              </div>
            )}
          >
            <Table
              {...options}
              style={{ marginTop: '16px' }}
              loading={
                isLoading || isValidating
                  ? {
                      style: { maxHeight: '100%' },
                      indicator: <TableLoading isOpen />,
                    }
                  : false
              }
              columns={wrapOnHeaderCell(columns)}
              dataSource={data}
              pagination={false}
              onChange={(pagination, filters, sorter) => {
                const s = sorter as SorterResult<T>;
                // s.order can be 'ascend' | 'descend' | undefined
                onParamsChange({
                  order_by: s.field as string,
                  direction: {
                    ascend: 'asc',
                    descend: 'desc',
                    _: undefined, // undefined is the default value
                  }[s.order || '_'],
                } as P);
              }}
              rowClassName={(record, index) =>
                index === 0 ? 'table-first-child' : ''
              }
              {...(!hidePagination && {
                footer: () => (
                  <Pagination
                    total={pagination.total!}
                    pageIndex={pagination.pageIndex}
                    itemOffset={itemOffset}
                    onPageChange={(selectedNumber, newOffset) => {
                      pagination.goToPage(selectedNumber);
                      setItemOffset(newOffset);
                    }}
                    onPageSizeChange={(value) => {
                      pagination.goToPage(0);
                      onParamsChange?.({ page_size: value } as P);
                    }}
                    text={pagination.text}
                    savePage={savePage}
                  />
                ),
              })}
            />
          </ConfigProvider>
        </div>
      </div>
    </div>
  );
};

export default A7Table;

