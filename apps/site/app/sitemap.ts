import { MetadataRoute } from 'next';
import { getConfig } from '@/lib/config';
import { PATH_API_HUB } from '@/constants/path-prefix';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { app } = getConfig();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: app.baseURL!,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${app.baseURL}${PATH_API_HUB}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Note: Dynamic product pages can be added here by fetching from API
  // Example:
  // const products = await fetchAllProducts();
  // const productPages = products.map((product) => ({
  //   url: `${app.baseURL}${PATH_API_HUB}/detail?id=${product.id}`,
  //   lastModified: new Date(product.updated_at),
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.8,
  // }));
  // return [...staticPages, ...productPages];

  return staticPages;
}
