import { useEffect, useState } from 'react';

import { Input } from 'antd';

import type { CardListProps } from './types';
import IconImage from '@/components/ui-legacy/icon-image';
import Pagination from '@/components/ui-legacy/paginate';
import ListEmpty from '@/components/ui-legacy/table/TableEmpty';
import ListLoading from '@/components/ui-legacy/table/TableLoading';
import { cn } from '@/lib/utils';

const CardList = <T extends object>({
  CardItem,
  data = [],
  isLoading,
  isValidating = false,
  title = '',
  toolBar = [],
  extra = '',
  helperText = '',
  showSearch = false,
  defaultSearch = '',
  shouldReset = false,
  onParamsChange,
  showPagination = true,
  pagination,
  reload,
  text = {
    resetToolTip: 'Reset Filter Conditions',
    resetButton: 'Reset',
    searchPlaceholder: 'Search',
    noData: 'No Data',
  },
  skeletonCount = 10,
  className,
  ...rest
}: CardListProps<T>) => {
  const [searchValue, setSearchValue] = useState<string>('');

  useEffect(() => setSearchValue(defaultSearch || ''), [defaultSearch]);

  const shouldShowHeadPart =
    title ||
    helperText ||
    (showSearch && onParamsChange) ||
    shouldReset ||
    toolBar.length > 0;

  return (
    <div className={cn('relative', className)} {...rest}>
      <ListLoading isOpen={isValidating} />
      {shouldShowHeadPart && (
        <div
          className={cn(
            'flex justify-between',
            helperText ? 'flex-col' : 'flex-row'
          )}
        >
          <div className="flex justify-end w-full">
            {showSearch && onParamsChange && (
              <Input
                className="dark:bg-transparent dark:text-primary-content"
                placeholder={text.searchPlaceholder}
                value={searchValue}
                prefix={<IconImage type="search" size={18} />}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    pagination?.goToPage(0);
                    onParamsChange({ search: searchValue || undefined });
                  }
                }}
              />
            )}
            {toolBar?.map((item, index) => (
              <div className="ml-2" key={index}>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        {extra}
        <div className="mt-5 relative min-w-0">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4 auto-rows-fr">
            {(isLoading
              ? (Array.from({ length: skeletonCount }).fill({}) as T[])
              : data
            ).map((item, idx) => (
              <div key={idx} className="h-full min-w-0">
                <CardItem
                  {...{
                    reload,
                    isLoading: isLoading || isValidating,
                    ...item,
                  }}
                />
              </div>
            ))}
          </div>

          {!data.length && !isLoading && (
            <div className="h-60">
              <ListEmpty description={text.noData ?? 'No Data'} />
            </div>
          )}

          {showPagination && (
            <Pagination
              isLoading={isLoading}
              total={pagination?.total!}
              pageIndex={pagination?.page! - 1}
              itemOffset={(pagination?.page! - 1) * pagination?.pageSize!}
              onPageChange={(selectedNumber) => {
                pagination?.goToPage(selectedNumber + 1);
              }}
              onPageSizeChange={(value) => {
                pagination?.goToPage(0);
                onParamsChange?.({ page_size: value });
              }}
              text={pagination?.text}
              className="mt-4"
              savePage
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CardList;
