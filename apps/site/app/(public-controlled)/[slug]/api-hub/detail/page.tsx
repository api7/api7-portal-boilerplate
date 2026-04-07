import { Metadata } from 'next';
import ProductDetail from '@/components/api-hub/detail/ProductDetail';
import { PATH_API_HUB } from '@/constants/path-prefix';
import { generateApiHubDetailMetadata } from '@/lib/seo/apiHubDetailMetadata';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { id } = await searchParams;
  return generateApiHubDetailMetadata(
    id,
    `/${slug}${PATH_API_HUB}/detail?id=${id ?? ''}`
  );
}

export default async function SlugProductDetailPage({ searchParams }: Props) {
  const { id } = await searchParams;
  return <ProductDetail id={id ?? ''} />;
}
