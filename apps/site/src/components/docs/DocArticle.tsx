import { notFound } from 'next/navigation';

import { getDocBySlug, getDocsNav } from '@/lib/docs/content';
import CopyPageButton from '@/components/docs/CopyPageButton';
import DocsPager from '@/components/docs/DocsPager';
import DocsToc from '@/components/docs/DocsToc';
import MdxContent from '@/components/docs/MdxContent';
import Prose from '@/components/docs/Prose';

/**
 * Renders one doc page: MDX body as prose on the left, on-page TOC on the
 * right. Shared by the /docs index and /docs/[...slug] routes. 404s when the
 * slug has no matching file.
 */
export default function DocArticle({ slug }: { slug: string[] }) {
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  const href = slug.length ? `/docs/${slug.join('/')}` : '/docs';
  const nav = getDocsNav();
  const idx = nav.findIndex((n) => n.href === href);
  const prev = idx > 0 ? nav[idx - 1] : undefined;
  const next = idx >= 0 && idx < nav.length - 1 ? nav[idx + 1] : undefined;

  const title = doc.frontmatter.title || 'Documentation';

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="relative min-w-0">
        {/* Top-right, aligned with the H1 on desktop; a normal row on mobile. */}
        <div className="mb-3 flex justify-end sm:absolute sm:top-0 sm:right-0 sm:z-10 sm:mb-0">
          <CopyPageButton source={doc.source} title={title} />
        </div>
        <Prose>
          <MdxContent source={doc.source} />
        </Prose>
        <DocsPager prev={prev} next={next} />
      </div>
      <aside className="hidden xl:block">
        <div className="sticky top-[calc(var(--app-header-height)+1.5rem)]">
          <DocsToc headings={doc.headings} />
        </div>
      </aside>
    </div>
  );
}
