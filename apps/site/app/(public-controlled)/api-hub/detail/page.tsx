import { Metadata } from 'next';
import ProductDetail from '@/components/api-hub/detail/ProductDetail';
import { PATH_API_HUB } from '@/constants/path-prefix';
import { generateApiHubDetailMetadata } from '@/lib/seo/apiHubDetailMetadata';

type Props = {
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { id } = await searchParams;
  return generateApiHubDetailMetadata(
    id,
    `${PATH_API_HUB}/detail?id=${id ?? ''}`
  );
}

export default async function ProductDetailPage({ searchParams }: Props) {
  const { id } = await searchParams;
  return <ProductDetail id={id ?? ''} />;
}
