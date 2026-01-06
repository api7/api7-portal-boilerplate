import { Metadata } from 'next';
import { getConfig } from '@/lib/config';

interface SEOConfig {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  type?: 'website' | 'article';
}

export function generateSEO(config: SEOConfig): Metadata {
  const { app } = getConfig();

  return {
    title: config.title,
    description: config.description,
    openGraph: {
      title: config.title,
      description: config.description,
      url: config.path ? `${app.baseURL}${config.path}` : app.baseURL!,
      siteName: app.name,
      type: config.type || 'website',
      images: config.image ? [{ url: config.image }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: config.title,
      description: config.description,
    },
    robots: config.noIndex ? { index: false, follow: false } : undefined,
    alternates: {
      canonical: config.path ? `${app.baseURL}${config.path}` : app.baseURL!,
    },
  };
}
