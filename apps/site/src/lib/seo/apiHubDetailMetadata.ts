import { Metadata } from 'next';
import { generateSEO } from '@/lib/seo/metadata';
import { portal } from '@/lib/portal-sdk/server';

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

export async function generateApiHubDetailMetadata(
  id: string | undefined,
  pagePath: string
): Promise<Metadata> {
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
      path: pagePath,
    });
  }

  return generateSEO({
    title: product.name,
    description:
      product.desc || 'View detailed API documentation and specifications.',
    path: pagePath,
    image: product.logo,
    type: 'article',
  });
}
