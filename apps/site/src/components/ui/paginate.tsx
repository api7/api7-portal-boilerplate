'use client';

import { type FC, useEffect, useState } from 'react';

import { useDeepCompareEffect } from 'ahooks';
import { Select } from 'antd';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ReactPaginate from 'react-paginate';

import { BareIconImage } from './icon-image';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';
import type { WithSavePage } from '@/types/utils';

export type PaginationProps = {
  total: number;
  onPageChange: (selected: number, newOffset: number) => void;
  pageIndex: number;
  itemOffset: number;
  text?: {
    results?: string;
    of?: string;
  };
  className?: string;
  isLoading?: boolean;
  onPageSizeChange?: (value: number) => void;
} & WithSavePage;

type PrevNextLabelProps = {
  disable: boolean;
  mode?: 'prev' | 'next';
};

const pageSizeOptions = [10, 20, 50, 100];
const PrevNextLabel: FC<PrevNextLabelProps> = (props) => {
  const { disable, mode = 'prev' } = props;
  return (
    <div
      className={cn(
        disable && 'cursor-not-allowed opacity-50',
        'flex border border-style-solid border-gray-200 rounded-sm w-6 h-6 justify-center items-center'
      )}
    >
      <BareIconImage
        src="/icons/arrow.svg"
        className={cn(mode === 'prev' && 'rotate-180', 'w-[4.28px] h-[7.5px]')}
      />
    </div>
  );
};

const Pagination: FC<PaginationProps> = (props) => {
  const {
    total,
    onPageChange,
    pageIndex,
    itemOffset,
    text = {
      results: 'Results:',
      of: 'of',
    },
    className,
    onPageSizeChange,
    savePage,
  } = props;
  const [pageCount, setPageCount] = useState(0);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const pageSizeRouter =
    Number(searchParams.get('page_size')) || pageSizeOptions[0];
  const [pageSize, setPageSize] = useState(pageSizeRouter);

  useDeepCompareEffect(() => {
    // Read current page from URL, not from props
    const currentPageFromUrl = Number(searchParams.get('page')) || 1;
    const notInPageOptions = !pageSizeOptions.includes(pageSize);

    // Only validate page number when total > 0 (data has loaded)
    const isInvalidPage = total > 0 && currentPageFromUrl * pageSize > total;
    const needsUpdate = notInPageOptions || isInvalidPage;

    if (!needsUpdate) return;

    const newParams = new URLSearchParams(searchParams.toString());
    if (notInPageOptions) {
      newParams.set('page_size', String(pageSizeOptions[0]));
      newParams.set('page', '1');
    } else {
      // Calculate last valid page when total > 0
      const lastPage = total > 0 ? Math.ceil(total / pageSize) : 1;
      newParams.set('page', String(lastPage));
      newParams.set('page_size', String(pageSize));
    }

    // Check if URL actually needs to be updated
    const currentUrl = searchParams.toString();
    const newUrl = newParams.toString();
    if (currentUrl === newUrl) return;

    setPageSize(Number(newParams.get('page_size')));
    if (!savePage) return;

    const finalUrl = newUrl ? `${pathname}?${newUrl}` : pathname;
    router.replace(finalUrl);
  }, [searchParams, pageSize, total, router, savePage, pathname]);

  useEffect(
    () => setPageCount(Math.ceil(total / pageSize) || 1),
    [pageSize, total]
  );

  const handlePageClick = (event: { selected: number }) => {
    const newOffset = (event.selected * pageSize) % total;
    onPageChange(event.selected, newOffset);
  };

  return (
    <div className={cn('flex justify-between py-4 px-3 h-11', className)}>
      <div className="flex gap-1">
        <p className="font-size-sm text-gray-500">{text.results}</p>{' '}
        <p className="text-gray-800" data-testid="result-text">
          {total === 0
            ? '0-0'
            : `${itemOffset + 1}-${Math.min(
                itemOffset + pageSize,
                total
              )}`}{' '}
          {text.of} {total}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <ReactPaginate
          pageClassName={'min-w-6 ml-2 h-6 text-center'}
          className={'max-w-[auto] flex list-none text-gray-800'}
          nextClassName={'ml-2'}
          activeClassName={'bg-primary [&>a]:text-white! rounded-sm'}
          breakClassName={'ml-2'}
          forcePage={pageIndex}
          nextLabel={
            <PrevNextLabel disable={pageIndex === pageCount - 1} mode="next" />
          }
          onPageChange={handlePageClick}
          pageRangeDisplayed={2}
          pageCount={pageCount}
          previousLabel={
            <PrevNextLabel disable={pageIndex === 0} mode="prev" />
          }
        />
        <Select
          value={pageSize}
          onChange={(value) => {
            setPageSize(value);
            onPageSizeChange?.(value);
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          options={pageSizeOptions.map((size) => ({
            value: size,
            label: `${size} / page`,
          }))}
          size="small"
          className="pagination-select "
          style={{
            width: 110,
          }}
        />
      </div>
    </div>
  );
};

const PaginationWrapper: typeof Pagination = (props) => {
  const { isLoading, className } = props;
  if (isLoading) return <Skeleton className={cn(className, 'h-10')} />;
  return <Pagination {...props} />;
};

export default PaginationWrapper;
