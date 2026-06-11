import type { Metadata } from 'next';

import DocArticle from '@/components/docs/DocArticle';
import { getDocBySlug } from '@/lib/docs/content';
import { generateSEO } from '@/lib/seo/metadata';
import { PATH_DOCS } from '@/constants/path-prefix';

export function generateMetadata(): Metadata {
  const doc = getDocBySlug([]);
  return generateSEO({
    title: doc?.frontmatter.title || 'Documentation',
    description:
      doc?.frontmatter.description || 'Guides and reference documentation.',
    path: PATH_DOCS,
  });
}

export default function DocsIndexPage() {
  return <DocArticle slug={[]} />;
}
