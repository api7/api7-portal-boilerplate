import { unstable_cache } from 'next/cache';
import { MetadataRoute } from 'next';

import { PATH_API_HUB, PATH_DOCS } from '@/constants/path-prefix';
import { getConfig } from '@/lib/config';
import { portal } from '@/lib/portal-sdk/server';
import { getDocSlugs } from '@/lib/docs/content';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

const getPublicAccess = unstable_cache(
  () => portal.systemSetting.getPublicAccess(),
  ['sitemap-public-access'],
  { revalidate: 3600 },
);

const getAllProducts = unstable_cache(
  async () => {
    const items: Array<{ id: string; updated_at?: Date }> = [];
    let page = 1;
    while (true) {
      const result = await portal.apiProduct.list({ page, page_size: PAGE_SIZE });
      items.push(...result.list.map((p) => ({ id: p.id, updated_at: p.updated_at })));
      if (items.length >= result.total) break;
      page++;
    }
    return items;
  },
  ['sitemap-products'],
  { revalidate: 3600 },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { app } = getConfig();

  const docPages: MetadataRoute.Sitemap = [
    { url: `${app.baseURL}${PATH_DOCS}`, changeFrequency: 'weekly', priority: 0.7 },
    ...getDocSlugs().map((slug) => ({
      url: `${app.baseURL}${PATH_DOCS}/${slug.join('/')}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];

  const staticPages: MetadataRoute.Sitemap = [
    { url: app.baseURL!, changeFrequency: 'weekly', priority: 1 },
    { url: `${app.baseURL}${PATH_API_HUB}`, changeFrequency: 'daily', priority: 0.9 },
    ...docPages,
  ];

  const publicAccess = await getPublicAccess();
  if (!publicAccess) return staticPages;

  try {
    const products = await getAllProducts();
    const productPages: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${app.baseURL}${PATH_API_HUB}/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    return [...staticPages, ...productPages];
  } catch {
    return staticPages;
  }
}
