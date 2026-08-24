import '@tanstack/react-start/server-only';

import { createFileRoute } from '@tanstack/react-router';

import { PATH_API_HUB } from '@/constants/path-prefix';
import { memoizeWithTtl } from '@/lib/cache';
import { getConfig } from '@/lib/config';
import { source } from '@/lib/docs/source';
import { portal } from '@/lib/portal-sdk/server';

const PAGE_SIZE = 100;

const getPublicAccessCached = memoizeWithTtl(
  () => portal.systemSetting.getPublicAccess(),
  60 * 60 * 1000,
);

// Hard cap so an inconsistent list/total from the Portal API can't loop forever.
const MAX_PAGES = 1000;

const getAllProductsCached = memoizeWithTtl(
  async () => {
    const items: Array<{ id: string; updated_at?: Date }> = [];
    let page = 1;
    while (page <= MAX_PAGES) {
      const result = await portal.apiProduct.list({
        page,
        page_size: PAGE_SIZE,
      });
      if (result.list.length === 0) break;
      items.push(
        ...result.list.map((p) => ({ id: p.id, updated_at: p.updated_at })),
      );
      if (items.length >= result.total) break;
      page++;
    }
    return items;
  },
  60 * 60 * 1000,
);

type SitemapEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority?: number;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toXml(entries: SitemapEntry[]) {
  const urls = entries
    .map((e) => {
      const parts = [`<loc>${escapeXml(e.url)}</loc>`];
      if (e.lastModified)
        parts.push(`<lastmod>${e.lastModified.toISOString()}</lastmod>`);
      if (e.changeFrequency)
        parts.push(`<changefreq>${e.changeFrequency}</changefreq>`);
      if (e.priority !== undefined)
        parts.push(`<priority>${e.priority}</priority>`);
      return `<url>${parts.join('')}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

async function getSitemap() {
  const { app } = getConfig();

  const docPages: SitemapEntry[] = source.getPages().map((page) => ({
    url: `${app.baseURL}${page.url}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const apiHubEnabled = app.apiHub?.enabled !== false;

  const staticPages: SitemapEntry[] = [
    { url: app.baseURL!, changeFrequency: 'weekly', priority: 1 },
    ...(apiHubEnabled
      ? [
          {
            url: `${app.baseURL}${PATH_API_HUB}`,
            changeFrequency: 'daily' as const,
            priority: 0.9,
          },
        ]
      : []),
    ...docPages,
  ];

  const entries = await (async () => {
    if (!apiHubEnabled) return staticPages;

    const publicAccess = await getPublicAccessCached();
    if (!publicAccess) return staticPages;

    try {
      const products = await getAllProductsCached();
      const productPages: SitemapEntry[] = products.map((p) => ({
        url: `${app.baseURL}${PATH_API_HUB}/${p.id}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
      return [...staticPages, ...productPages];
    } catch {
      return staticPages;
    }
  })();

  return new Response(toXml(entries), {
    headers: { 'Content-Type': 'application/xml' },
  });
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: { GET: getSitemap },
  },
});
