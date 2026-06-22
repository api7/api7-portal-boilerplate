import { notFound } from 'next/navigation';
import { Metadata } from 'next';

import { PATH_API_HUB } from '@/constants/path-prefix';
import { getConfig } from '@/lib/config';
import { generateSEO } from '@/lib/seo/metadata';

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
  const { app } = getConfig();
  if (app.apiHub?.enabled === false) notFound();
  return children;
}
