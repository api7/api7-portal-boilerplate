import {
  createFileRoute,
  notFound,
  redirect,
  useLocation,
} from '@tanstack/react-router';

import ProductDetailView from '@/components/api-hub/detail/ProductDetailView';
import { PATH_API_HUB, PATH_LOGIN } from '@/constants/path-prefix';
import { loadQuery } from '@/lib/query/load-query';
import { productDetailQueryOptions } from '@/lib/query/product-detail';

const loginHrefFor = (href: string) =>
  `${PATH_LOGIN}?redirectTo=${encodeURIComponent(href)}`;

export const Route = createFileRoute('/_public/api-hub/$id')({
  loader: async ({ params, context, location }) => {
    const product = await loadQuery(
      context.queryClient,
      productDetailQueryOptions(null, params.id),
    );
    // `undefined` means a client navigation, where the view handles these cases.
    if (product === undefined) return undefined;

    if ((!product || product.visibility === 'logged_in') && !context.session) {
      throw redirect({ href: loginHrefFor(location.href) });
    }
    if (!product) throw notFound();
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
  const { id } = Route.useParams();
  const { session } = Route.useRouteContext();
  const location = useLocation();

  return (
    <ProductDetailView
      orgSlug={null}
      id={id}
      isAuthenticated={!!session?.user}
      basePath={PATH_API_HUB}
      loginHref={loginHrefFor(location.href)}
    />
  );
}
