import { createFileRoute } from '@tanstack/react-router';

import { DocsPageView } from '@/components/docs/DocsPageView';
import { getDocPageMeta } from '@/lib/docs/page-meta';

export const Route = createFileRoute('/docs/')({
  loader: () => getDocPageMeta([]),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.title },
      { name: 'description', content: loaderData?.description },
    ],
  }),
  component: () => <DocsPageView slug={[]} />,
});
