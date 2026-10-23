import { createFileRoute, notFound } from '@tanstack/react-router';

import ProductDetailView from '@/components/api-hub/detail/ProductDetailView';
import { PATH_API_HUB } from '@/constants/path-prefix';
import { loadQuery } from '@/lib/query/load-query';
import { productDetailQueryOptions } from '@/lib/query/product-detail';
import { productSubscriptionStatusQueryOptions } from '@/lib/query/product-subscription-status';

export const Route = createFileRoute('/$slug/api-hub/$id')({
  loader: async ({ params, context }) => {
    // The subscription state doesn't depend on the product, so both load at once.
    const [product] = await Promise.all([
      loadQuery(
        context.queryClient,
        productDetailQueryOptions(params.slug, params.id),
      ),
      Promise.resolve(
        loadQuery(
          context.queryClient,
          productSubscriptionStatusQueryOptions(params.slug, params.id),
        ),
      ).catch(() => undefined),
    ]);
    if (product === null) throw notFound();
    return product;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.name ?? 'Product Details' },
      {
        name: 'description',
        content:
          loaderData?.desc ??
          'View detailed API documentation and specifications.',
      },
    ],
  }),
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug, id } = Route.useParams();

  return (
    <ProductDetailView
      orgSlug={slug}
      id={id}
      isAuthenticated
      basePath={`/${slug}${PATH_API_HUB}`}
    />
  );
}
