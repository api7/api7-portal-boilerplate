import { notFound } from 'next/navigation';

import { source } from '@/lib/docs/source';

export const dynamic = 'force-static';

type PageData = {
  title: string;
  description?: string;
  getText: (type: 'raw' | 'processed') => Promise<string>;
};

export function generateStaticParams() {
  return source.getPages().map((page) => ({ slug: page.slugs.length ? page.slugs : undefined }));
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const page = source.getPage(slug ?? []);
  if (!page) notFound();

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
