import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';

import CopyPageButton from '@/components/docs/CopyPageButton';
import type { getDocContent } from '@/lib/docs/data';

type DocContent = Awaited<ReturnType<typeof getDocContent>>;

export function DocsPageView({ content }: { content: DocContent }) {
  return (
    <DocsPage toc={content.toc} full={content.full}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
        <DocsTitle className="flex-1">{content.title}</DocsTitle>
        <CopyPageButton title={content.title} />
      </div>
      <DocsDescription>{content.description}</DocsDescription>
      <DocsBody>{content.body}</DocsBody>
    </DocsPage>
  );
}
