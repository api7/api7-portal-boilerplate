import '@tanstack/react-start/server-only';

import { createFileRoute } from '@tanstack/react-router';

import { source } from '@/lib/docs/source';

type PageData = {
  title: string;
  description?: string;
  getText: (type: 'raw' | 'processed') => Promise<string>;
};

async function getDocMarkdown({ params }: { params: { _splat?: string } }) {
  const slug = params._splat ? params._splat.split('/') : [];
  const page = source.getPage(slug);
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
}

export const Route = createFileRoute('/llms.mdx/docs/$')({
  server: {
    handlers: { GET: getDocMarkdown },
  },
});
