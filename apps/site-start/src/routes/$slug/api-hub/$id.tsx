import { createFileRoute, notFound } from '@tanstack/react-router';

import ProductDetail from '@/components/api-hub/detail/ProductDetail';
import { PATH_API_HUB } from '@/constants/path-prefix';
import { getApiProductForOrganization } from '@/lib/dal/api-products';

export const Route = createFileRoute('/$slug/api-hub/$id')({
  beforeLoad: async ({ params }) => {
    const product = await getApiProductForOrganization({
      data: { id: params.id, organizationSlug: params.slug },
    });
    if (!product) throw notFound();
    return { product };
  },
  loader: ({ context }) => context.product,
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
  const product = Route.useLoaderData();
  const { slug } = Route.useParams();

  return (
    <ProductDetail
      product={product}
      id={product.id}
      isAuthenticated
      basePath={`/${slug}${PATH_API_HUB}`}
    />
  );
}
