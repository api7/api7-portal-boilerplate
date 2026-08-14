import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import ProductDetail from '@/components/api-hub/detail/ProductDetail';
import { PATH_API_HUB, PATH_LOGIN } from '@/constants/path-prefix';
import { getApiProduct } from '@/lib/dal/api-products';

export const Route = createFileRoute('/_public/api-hub/$id')({
  beforeLoad: async ({ params, context, location }) => {
    const product = await getApiProduct({ data: params.id });

    // A guest can't tell "doesn't exist" apart from "exists but logged_in" —
    // the backend hides both behind a 404 — so send them to login first and
    // only show a real 404 once we know they're authenticated.
    if ((!product || product.visibility === 'logged_in') && !context.session) {
      throw redirect({
        href: `${PATH_LOGIN}?redirectTo=${encodeURIComponent(location.href)}`,
      });
    }

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
  const { session } = Route.useRouteContext();

  return (
    <ProductDetail
      product={product}
      id={product.id}
      isAuthenticated={!!session?.user}
      basePath={PATH_API_HUB}
    />
  );
}
