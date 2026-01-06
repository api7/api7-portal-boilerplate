import { MetadataRoute } from 'next';
import { getConfig } from '@/lib/config';
import { PATH_APPLICATIONS } from '@/constants/path-prefix';

export default function robots(): MetadataRoute.Robots {
  const { app } = getConfig();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', `${PATH_APPLICATIONS}/`],
      },
    ],
    sitemap: `${app.baseURL}/sitemap.xml`,
  };
}
