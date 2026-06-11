import DocsSearch from '@/components/docs/DocsSearch';
import DocsSearchTrigger from '@/components/docs/DocsSearchTrigger';
import DocsSidebar from '@/components/docs/DocsSidebar';
import MobileDocsNav from '@/components/docs/MobileDocsNav';
import { getDocsTree } from '@/lib/docs/content';

/**
 * Docs shell: left sidebar (built from the content tree) + content area.
 * The per-page on-page TOC lives in the page (DocArticle), not here, since it
 * depends on the rendered document's headings.
 */
export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tree = getDocsTree();

  return (
    <div className="mx-auto w-full max-w-7xl p-4">
      {/* Single search dialog instance for the whole docs section. */}
      <DocsSearch />
      <div className="mb-4 flex items-center gap-2 lg:hidden">
        <MobileDocsNav tree={tree} />
        <DocsSearchTrigger />
      </div>
      <div className="gap-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--app-header-height)+1.5rem)] max-h-[calc(100vh-var(--app-header-height)-3rem)] space-y-3 overflow-y-auto pr-2">
            <DocsSearchTrigger />
            <DocsSidebar tree={tree} />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
