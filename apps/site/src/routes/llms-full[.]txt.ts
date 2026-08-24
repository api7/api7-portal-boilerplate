import '@tanstack/react-start/server-only';

import { createFileRoute } from '@tanstack/react-router';

import { source } from '@/lib/docs/source';

type PageData = {
  title: string;
  description?: string;
  getText: (type: 'raw' | 'processed') => Promise<string>;
};

async function getLlmsFullTxt() {
  const pages = source
    .getPages()
    .filter(
      (page) => (page.data as PageData & { llms?: boolean }).llms !== false,
    );
  const parts = await Promise.all(
    pages.map(async (page) => {
      const data = page.data as PageData;
      const content = await data.getText('processed');
      const header = [
        `# ${data.title}`,
        data.description ? `\n${data.description}` : '',
        `\nURL: ${page.url}`,
      ].join('');
      return `${header}\n\n${content}`;
    }),
  );
  return new Response(parts.join('\n\n---\n\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: { GET: getLlmsFullTxt },
  },
});
