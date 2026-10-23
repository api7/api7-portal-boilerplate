'use client';

import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { notFound, useNavigate } from '@tanstack/react-router';

import ProductDetail from './ProductDetail';
import { Skeleton } from '@/components/ui/skeleton';
import { productDetailQueryOptions } from '@/lib/query/product-detail';

type Props = {
  orgSlug: string | null;
  id: string;
  isAuthenticated: boolean;
  basePath: string;
  // Where a guest is sent when the product is hidden from them.
  loginHref?: string;
};

function ProductDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-5 w-24" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-lg" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function ProductDetailView({
  orgSlug,
  id,
  isAuthenticated,
  basePath,
  loginHref,
}: Props) {
  const { data: product, isLoading, error } = useQuery(
    productDetailQueryOptions(orgSlug, id),
  );

  const navigate = useNavigate();

  useEffect(() => {
    if (product?.name) document.title = product.name;
  }, [product?.name]);

  // A guest can't tell a missing product from a logged_in one, so they go to login first.
  const sendToLogin =
    !!loginHref &&
    !isAuthenticated &&
    !isLoading &&
    !error &&
    (!product || product.visibility === 'logged_in');

  useEffect(() => {
    if (sendToLogin) void navigate({ href: loginHref, replace: true });
  }, [sendToLogin, loginHref, navigate]);

  if (isLoading || sendToLogin) return <ProductDetailSkeleton />;
  if (!product) {
    if (error) throw error;
    throw notFound();
  }

  return (
    <ProductDetail
      product={product}
      id={product.id}
      isAuthenticated={isAuthenticated}
      basePath={basePath}
    />
  );
}
