import { createFileRoute } from '@tanstack/react-router';

import { DocsPageView } from '@/components/docs/DocsPageView';
import { getDocPageMeta } from '@/lib/docs/page-meta';
import { source } from '@/lib/docs/source';

type PageData = {
  title: string;
  description?: string;
  getText: (type: 'raw' | 'processed') => Promise<string>;
};

const splatToSlug = (splat?: string) => (splat ? splat.split('/') : []);

export const Route = createFileRoute('/docs/$')({
  loader: ({ params }) => getDocPageMeta(splatToSlug(params._splat)),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.title },
      { name: 'description', content: loaderData?.description },
    ],
  }),
  component: DocPage,
  server: {
    // A route with both a `component` and `server.handlers` may "defer" —
    // calling `next()` here falls through to the normal SSR page render.
    handlers: {
      GET: async ({ params, next }) => {
        const splat = params._splat ?? '';
        if (!splat.endsWith('.md')) return next();

        const page = source.getPage(splatToSlug(splat.slice(0, -3)));
        if (!page) return new Response(null, { status: 404 });

        const data = page.data as PageData;
        const content = await data.getText('processed');
        const header = [
          `# ${data.title}`,
          data.description ? `\n${data.description}` : '',
        ].join('');
        return new Response(`${header}\n\n${content}`, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      },
    },
  },
});

function DocPage() {
  const { _splat } = Route.useParams();
  return <DocsPageView slug={splatToSlug(_splat)} />;
}
