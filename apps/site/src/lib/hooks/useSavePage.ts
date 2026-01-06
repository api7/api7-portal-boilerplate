'use client';

import { useMemoizedFn } from 'ahooks';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Save page to router when params change
   */
  const onParamsChange = useMemoizedFn((p: Partial<T>) => {
    const final = updateParams(p);
    if (!savePage) return;

    // Build new search params
    const newSearchParams = new URLSearchParams(searchParams.toString());
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

    router.push(newUrl);
  });

  return { onParamsChange };
};

export { useSavePage };

