import { createFileRoute, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

import { getConfig } from '@/lib/config';

const getApiHubEnabled = createServerFn({ method: 'GET' }).handler(
  async () => getConfig().app.apiHub?.enabled !== false,
);

export const Route = createFileRoute('/$slug/api-hub')({
  beforeLoad: async () => {
    if (!(await getApiHubEnabled())) {
      throw notFound();
    }
  },
  head: () => ({
    meta: [
      { title: 'API Hub' },
      {
        name: 'description',
        content:
          'Browse our collection of APIs and products. Find the perfect API for your integration needs.',
      },
    ],
  }),
});
