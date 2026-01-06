'use client';

import CardList from '@/components/api-hub/card-list';
import Filter from '@/components/api-hub/Filter';
import ProductCard from '@/components/api-hub/ProductCard';
import { DEFAULT_LIST_PARAMS } from '@/constants/common';
import useProductList from '@/lib/query/useProductList';
import { cn } from '@/lib/utils';
import type { ApiProductListItem as ProductResVal } from '@/types/portal-sdk';
import { Suspense } from 'react';

const Products = () => {
  const {
    data,
    pagination,
    isLoading,
    isValidating,
    refetch,
    onParamsChange,
    params,
  } = useProductList({
    initParams: DEFAULT_LIST_PARAMS,
    savePage: true,
  });

  return (
    <div className={cn('flex gap-4', isLoading && 'min-h-[50vh]')}>
      <Filter
        onParamsChange={onParamsChange}
        defaultFilter={params.subscription_status}
      />
      <CardList<ProductResVal>
        CardItem={ProductCard}
        data={data as ProductResVal[]}
        isLoading={isLoading}
        isValidating={isValidating}
        pagination={pagination}
        reload={refetch}
        onParamsChange={onParamsChange}
        showSearch
        defaultSearch={params.search}
        skeletonCount={params.page_size}
        className="card-container"
      />
    </div>
  );
};

export default function PublicControlledApiHub() {
  return (
    <Suspense>
      <Products />
    </Suspense>
  );
}
