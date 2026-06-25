import { source } from '@/lib/docs/source';

export const dynamic = 'force-static';

type PageData = {
  title: string;
  description?: string;
  getText: (type: 'raw' | 'processed') => Promise<string>;
};

export async function GET() {
  const pages = source.getPages();
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
