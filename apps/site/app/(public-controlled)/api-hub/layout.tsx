import { Metadata } from 'next';
import { generateSEO } from '@/lib/seo/metadata';
import { PATH_API_HUB } from '@/constants/path-prefix';

export const metadata: Metadata = generateSEO({
  title: 'API Hub',
  description:
    'Browse our collection of APIs and products. Find the perfect API for your integration needs.',
  path: PATH_API_HUB,
});

export default function ApiHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
