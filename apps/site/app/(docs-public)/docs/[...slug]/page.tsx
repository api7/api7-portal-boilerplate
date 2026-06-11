import type { Metadata } from 'next';

import DocArticle from '@/components/docs/DocArticle';
import { getDocBySlug, getDocSlugs } from '@/lib/docs/content';
import { generateSEO } from '@/lib/seo/metadata';
import { PATH_DOCS } from '@/constants/path-prefix';

type Params = { slug: string[] };

// Pre-list known docs so build output enumerates them; pages still render
// dynamically (the shared layout's Header reads cookies).
export function generateStaticParams(): Params[] {
  return getDocSlugs()
    .filter((slug) => slug.length > 0)
    .map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) {
    return generateSEO({
      title: 'Not Found',
      description: 'The requested document could not be found.',
      noIndex: true,
    });
  }
  return generateSEO({
    title: doc.frontmatter.title,
    description: doc.frontmatter.description || 'Documentation',
    path: `${PATH_DOCS}/${slug.join('/')}`,
    type: 'article',
  });
}

export default async function DocsSlugPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  return <DocArticle slug={slug} />;
}
