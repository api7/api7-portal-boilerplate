'use client';

import { useLocation, useNavigate } from '@tanstack/react-router';
import { useMemoizedFn } from 'ahooks';

import type { WithSavePage } from '@/types/utils';

// Type that can be converted to string for URL params
type Stringifiable = string | number | boolean | null | undefined;
type SavePageParams<T extends Record<string, Stringifiable | Stringifiable[] | Record<string, Stringifiable>>> =
  WithSavePage<{
    updateParams: (params: Partial<T>) => T;
  }>;

const useSavePage = <T extends Record<string, Stringifiable | Stringifiable[] | Record<string, Stringifiable>>>(
  params: SavePageParams<T>
) => {
  const { savePage = false, updateParams } = params;
  const navigate = useNavigate();
  const { pathname, searchStr } = useLocation();

  /**
   * Save page to router when params change
   */
  const onParamsChange = useMemoizedFn((p: Partial<T>) => {
    const final = updateParams(p);
    if (!savePage) return;

    // Build new search params
    const newSearchParams = new URLSearchParams(searchStr);
    // A key present in the requested update but absent from the merged,
    // cleaned result was cleared (e.g. set to undefined) — drop it from the
    // URL too, or its old value would stick around after navigation/refresh.
    Object.keys(p).forEach((key) => {
      if (!(key in final)) newSearchParams.delete(key);
    });
    Object.entries(final).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        newSearchParams.delete(key);
      } else if (Array.isArray(value)) {
        newSearchParams.delete(key);
        value.forEach((v) => newSearchParams.append(key, String(v)));
      } else {
        newSearchParams.set(key, String(value));
      }
    });

    const newSearch = newSearchParams.toString();
    const newUrl = newSearch ? `${pathname}?${newSearch}` : pathname;

    navigate({ href: newUrl });
  });

  return { onParamsChange };
};

export { useSavePage };
