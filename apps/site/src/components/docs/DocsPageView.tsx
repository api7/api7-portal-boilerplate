import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';

import CopyPageButton from '@/components/docs/CopyPageButton';
import { getMDXComponents } from '@/components/docs/mdx';
import { source } from '@/lib/docs/source';

export function DocsPageView({ slug }: { slug: string[] }) {
  const page = source.getPage(slug);
  if (!page) return null;

  const { title, description, full, toc, body: MDX } = page.data;

  return (
    <DocsPage toc={toc} full={full}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
        <DocsTitle className="flex-1">{title}</DocsTitle>
        <CopyPageButton title={title} />
      </div>
      <DocsDescription>{description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}
