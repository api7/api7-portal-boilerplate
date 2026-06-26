import { source } from '@/lib/docs/source';

export const dynamic = 'force-static';

type PageData = {
  title: string;
  description?: string;
  llms?: boolean;
};

export function GET() {
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
