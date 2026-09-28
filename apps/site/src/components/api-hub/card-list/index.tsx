import { useState } from 'react';

import type { CardListProps } from './types';
import { SearchIcon } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import DataTablePagination from '@/components/base/data-table/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import ListEmpty from '@/components/base/empty';
import ListLoading from '@/components/base/data-table/table-loading';
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
  searchPrefix,
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
  const [searchValue, setSearchValue] = useState<string>(defaultSearch || '');
  const [prevDefaultSearch, setPrevDefaultSearch] = useState(defaultSearch);
  if (prevDefaultSearch !== defaultSearch) {
    setPrevDefaultSearch(defaultSearch);
    setSearchValue(defaultSearch || '');
  }

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
          <div className="flex justify-between w-full gap-2">
            <div>{searchPrefix}</div>
            <div className="flex items-center gap-2">
              {showSearch && onParamsChange && (
                <InputGroup className="min-w-0 sm:w-[220px]">
                  <InputGroupAddon>
                    <SearchIcon className="size-[18px]" />
                  </InputGroupAddon>
                  <InputGroupInput
                    placeholder={text.searchPlaceholder}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        pagination?.goToPage(0);
                        onParamsChange({ search: searchValue || undefined });
                      }
                    }}
                  />
                </InputGroup>
              )}
              {toolBar?.map((item, index) => (
                <div key={index}>{item}</div>
              ))}
            </div>
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
            isLoading ? (
              <Skeleton className="mt-4 h-10" />
            ) : (
              <DataTablePagination
                total={pagination?.total ?? 0}
                pageIndex={(pagination?.page ?? 1) - 1}
                pageSize={pagination?.pageSize ?? 10}
                goToPage={(page) => pagination?.goToPage(page + 1)}
                onPageSizeChange={(value) => {
                  pagination?.goToPage(0);
                  onParamsChange?.({ page_size: value });
                }}
                text={pagination?.text}
                className="mt-4"
                savePage
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default CardList;
