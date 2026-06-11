import { APIError } from '@api7/portal-sdk';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import ProductDetail from '@/components/api-hub/detail/ProductDetail';
import { PATH_API_HUB, PATH_LOGIN } from '@/constants/path-prefix';
import { generateApiHubDetailMetadata } from '@/lib/seo/apiHubDetailMetadata';
import { verifySessionAndOrganization } from '@/lib/dal';
import { portal } from '@/lib/portal-sdk/server';

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

  let product: Awaited<ReturnType<typeof portal.apiProduct.get>> | null = null;
  try {
    product = await portal.apiProduct.get(id);
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

  return <ProductDetail id={id} />;
}
