'use client';

import { useDeepCompareEffect } from 'ahooks';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export type DataTablePaginationProps = {
  total: number;
  pageIndex: number;
  pageSize: number;
  goToPage: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  savePage?: boolean;
  text?: { results?: string; of?: string };
  className?: string;
};

function getPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 0) return [];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const result: (number | 'ellipsis')[] = [0];
  const lo = Math.max(1, current - 1);
  const hi = Math.min(total - 2, current + 1);

  if (lo > 1) result.push('ellipsis');
  for (let i = lo; i <= hi; i++) result.push(i);
  if (hi < total - 2) result.push('ellipsis');
  result.push(total - 1);

  return result;
}

export default function DataTablePagination({
  total,
  pageIndex,
  goToPage,
  onPageSizeChange,
  savePage,
  text = { results: 'Results:', of: 'of' },
  className,
}: DataTablePaginationProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const pageSizeFromUrl = (Number(searchParams.get('page_size')) || PAGE_SIZE_OPTIONS[0]) as PageSize;
  const [currentPageSize, setCurrentPageSize] = useState<PageSize>(pageSizeFromUrl);
  const [prevPageSizeFromUrl, setPrevPageSizeFromUrl] = useState(pageSizeFromUrl);
  if (prevPageSizeFromUrl !== pageSizeFromUrl) {
    setPrevPageSizeFromUrl(pageSizeFromUrl);
    setCurrentPageSize(pageSizeFromUrl);
  }

  const pageCount = total > 0 ? Math.ceil(total / currentPageSize) : 0;
  const itemStart = total === 0 ? 0 : pageIndex * currentPageSize + 1;
  const itemEnd = Math.min((pageIndex + 1) * currentPageSize, total);

  useDeepCompareEffect(() => {
    const currentPageFromUrl = Number(searchParams.get('page')) || 1;
    const notInPageOptions = !PAGE_SIZE_OPTIONS.includes(currentPageSize);
    const isInvalidPage = total > 0 && currentPageFromUrl * currentPageSize > total;

    if (!notInPageOptions && !isInvalidPage) return;

    const newParams = new URLSearchParams(searchParams.toString());
    if (notInPageOptions) {
      newParams.set('page_size', String(PAGE_SIZE_OPTIONS[0]));
      newParams.set('page', '1');
    } else {
      const lastPage = total > 0 ? Math.ceil(total / currentPageSize) : 1;
      newParams.set('page', String(lastPage));
      newParams.set('page_size', String(currentPageSize));
    }

    if (searchParams.toString() === newParams.toString()) return;
    setCurrentPageSize(Number(newParams.get('page_size')) as PageSize);
    if (!savePage) return;
    router.replace(`${pathname}?${newParams.toString()}`);
  }, [searchParams, currentPageSize, total, savePage, pathname]);


  const pages = getPageRange(pageIndex, pageCount);
  const isFirst = pageIndex === 0;
  const isLast = pageCount === 0 || pageIndex >= pageCount - 1;

  return (
    <div className={cn('flex items-center justify-between border-t py-3 px-3 text-sm', className)}>
      <div className="flex gap-1 text-muted-foreground">
        <span>{text.results}</span>
        <span className="text-foreground" data-testid="result-text">
          {total === 0 ? '0-0' : `${itemStart}-${itemEnd}`} {text.of} {total}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Pagination className="w-auto mx-0 justify-start">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink
                href="#"
                aria-label="Previous page"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  if (!isFirst) goToPage(pageIndex - 1);
                }}
                className={cn(isFirst && 'pointer-events-none opacity-40')}
              >
                <ChevronLeftIcon className="size-4" />
              </PaginationLink>
            </PaginationItem>
            {pages.map((page, i) =>
              page === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={page === pageIndex}
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(page);
                    }}
                  >
                    {page + 1}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationLink
                href="#"
                aria-label="Next page"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  if (!isLast) goToPage(pageIndex + 1);
                }}
                className={cn(isLast && 'pointer-events-none opacity-40')}
              >
                <ChevronRightIcon className="size-4" />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <Select
          items={PAGE_SIZE_OPTIONS.map((size) => ({ value: size, label: `${size} / page` }))}
          value={currentPageSize}
          onValueChange={(value) => {
            if (!value) return;
            setCurrentPageSize(value as PageSize);
            onPageSizeChange?.(value);
          }}
        >
          <SelectTrigger className="w-[110px] h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size}>
                  {`${size} / page`}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
