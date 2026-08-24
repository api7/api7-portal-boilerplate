import '@tanstack/react-start/server-only';

import { createFileRoute } from '@tanstack/react-router';

import { source } from '@/lib/docs/source';

type PageData = {
  title: string;
  description?: string;
  llms?: boolean;
};

function getLlmsTxt() {
  const pages = source
    .getPages()
    .filter((page) => (page.data as PageData).llms !== false);
  const lines = pages.map((page) => {
    const data = page.data as PageData;
    const title = data.title.replace(/([[\]])/g, '\\$1');
    const url = page.url.replace(/([()])/g, '\\$1');
    const link = `[${title}](${url})`;
    return data.description ? `- ${link}: ${data.description}` : `- ${link}`;
  });
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: { GET: getLlmsTxt },
  },
});
