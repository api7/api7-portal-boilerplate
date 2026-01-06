import { Metadata } from 'next';
import ProductDetail from '@/components/api-hub/detail/ProductDetail';
import { generateSEO } from '@/lib/seo/metadata';
import { PATH_API_HUB } from '@/constants/path-prefix';
import { portal } from '@/lib/portal-sdk/server';

interface Props {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

async function fetchProductForMetadata(
  id: string
): Promise<{ name: string; desc?: string; logo?: string } | null> {
  try {
    const product = await portal.apiProduct.get(id);
    return {
      name: product.name,
      desc: product.desc,
      logo: product.type === 'gateway' ? product.logo : undefined,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { id } = await searchParams;

  if (!id) {
    return generateSEO({
      title: 'Product Not Found',
      description: 'The requested product could not be found.',
      noIndex: true,
    });
  }

  const product = await fetchProductForMetadata(id);

  if (!product) {
    return generateSEO({
      title: 'Product Details',
      description: 'View detailed API documentation and specifications.',
      path: `${PATH_API_HUB}/detail?id=${id}`,
    });
  }

  return generateSEO({
    title: product.name,
    description:
      product.desc || 'View detailed API documentation and specifications.',
    path: `${PATH_API_HUB}/detail?id=${id}`,
    image: product.logo,
    type: 'article',
  });
}

export default async function ProductDetailPage({ searchParams }: Props) {
  const { id } = await searchParams;
  return <ProductDetail id={id ?? ''} />;
}
