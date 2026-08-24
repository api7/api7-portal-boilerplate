import { createFileRoute } from '@tanstack/react-router';

import { DocsPageView } from '@/components/docs/DocsPageView';
import { getDocContent } from '@/lib/docs/data';

export const Route = createFileRoute('/docs/')({
  loader: () => getDocContent({ data: { slug: [] } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.title },
      { name: 'description', content: loaderData?.description },
    ],
  }),
  component: DocIndexPage,
});

function DocIndexPage() {
  const content = Route.useLoaderData();
  return <DocsPageView content={content} />;
}
