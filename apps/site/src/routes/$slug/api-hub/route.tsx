import { createFileRoute, notFound } from '@tanstack/react-router';

export const Route = createFileRoute('/$slug/api-hub')({
  beforeLoad: ({ context }) => {
    if (!context.appMeta.showApiHub) {
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
