import { APIError } from '@api7/portal-sdk';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import ProductDetail from '@/components/api-hub/detail/ProductDetail';
import { PATH_API_HUB, PATH_LOGIN } from '@/constants/path-prefix';
import { generateApiHubDetailMetadata } from '@/lib/seo/apiHubDetailMetadata';
import { verifySessionAndOrganization } from '@/lib/dal';
import { portal } from '@/lib/portal-sdk/server';
import { productDetailKey } from '@/lib/query/keys';
import { getQueryClient } from '@/lib/req';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return generateApiHubDetailMetadata(id, `${PATH_API_HUB}/${id}`);
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const { session } = await verifySessionAndOrganization({ respectPublicAccess: true });

  const queryClient = getQueryClient();
  let product: Awaited<ReturnType<typeof portal.apiProduct.get>> | null = null;
  try {
    product = await portal.apiProduct.get(id);
    queryClient.setQueryData(productDetailKey(null, id), product);
  } catch (err) {
    if (APIError.isAPIError(err) && err.status === 404) {
      product = null;
    } else {
      throw err;
    }
  }

  if (!product || product.visibility === 'logged_in') {
    if (!session) {
      const hdrs = await headers();
      const pathname = hdrs.get('x-pathname');
      redirect(pathname ? `${PATH_LOGIN}?redirect=${encodeURIComponent(pathname)}` : PATH_LOGIN);
    }
  }

  if (!product) notFound();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductDetail id={id} />
    </HydrationBoundary>
  );
}
