import { APIError } from '@api7/portal-sdk';
import type { ApiProduct } from '@api7/portal-sdk/unstable-types';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import ProductDetail from '@/components/api-hub/detail/ProductDetail';
import { PATH_API_HUB, PATH_ROOT } from '@/constants/path-prefix';

import { generateApiHubDetailMetadata } from '@/lib/seo/apiHubDetailMetadata';
import { getPortalForOrganization } from '@/lib/dal/admin-organization';
import { verifyOrganizationAccessBySlug } from '@/lib/dal/util';

type Props = {
  params: Promise<{ slug: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  return generateApiHubDetailMetadata(id, `/${slug}${PATH_API_HUB}/${id}`);
}

export default async function SlugProductDetailPage({ params }: Props) {
  const { slug, id } = await params;
  const org = await verifyOrganizationAccessBySlug(slug);
  if (!org) redirect(PATH_ROOT);

  let product: ApiProduct;
  try {
    product = await getPortalForOrganization(org.id).apiProduct.get(id);
  } catch (err) {
    if (APIError.isAPIError(err) && err.status === 404) notFound();
    throw err;
  }

  return <ProductDetail product={product} id={id} isAuthenticated basePath={`/${slug}${PATH_API_HUB}`} />;
}
