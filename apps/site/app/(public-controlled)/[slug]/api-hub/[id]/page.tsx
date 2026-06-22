import { APIError } from '@api7/portal-sdk';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import ProductDetail from '@/components/api-hub/detail/ProductDetail';
import { PATH_API_HUB, PATH_LOGIN } from '@/constants/path-prefix';
import { generateApiHubDetailMetadata } from '@/lib/seo/apiHubDetailMetadata';
import { verifySessionAndOrganization } from '@/lib/dal';
import { getPortalForOrganization } from '@/lib/dal/admin-organization';
import { verifyOrganizationAccessBySlug } from '@/lib/dal/util';
import { portal } from '@/lib/portal-sdk/server';
import { productDetailKey } from '@/lib/query/keys';
import { getQueryClient } from '@/lib/req';

type Props = {
  params: Promise<{ slug: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  return generateApiHubDetailMetadata(id, `/${slug}${PATH_API_HUB}/${id}`);
}

export default async function SlugProductDetailPage({ params }: Props) {
  const { slug, id } = await params;
  const [{ session }, org] = await Promise.all([
    verifySessionAndOrganization({ respectPublicAccess: true }),
    verifyOrganizationAccessBySlug(slug),
  ]);

  const queryClient = getQueryClient();
  let product: Awaited<ReturnType<typeof portal.apiProduct.get>> | null = null;
  try {
    // Use org developer context when available so dp-manager returns raw_openapis
    // for subscribed developers. Fall back to admin portal for guest/public access.
    const productPortal = org ? getPortalForOrganization(org.id) : portal;
    product = await productPortal.apiProduct.get(id);
    queryClient.setQueryData(productDetailKey(slug, id), product);
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

  if (!org) redirect(`${PATH_API_HUB}/${id}`);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductDetail id={id} />
    </HydrationBoundary>
  );
}
