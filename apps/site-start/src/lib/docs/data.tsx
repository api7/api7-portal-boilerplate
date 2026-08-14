import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { renderServerComponent } from '@tanstack/react-start/rsc';
import { visit } from 'fumadocs-core/page-tree';
import type { TOCItemType } from 'fumadocs-core/toc';
import { z } from 'zod';

import { getMDXComponents } from '@/components/docs/mdx';
import { docs, source } from './source';

export const getDocsTree = createServerFn({ method: 'GET' }).handler(
  // Flattens name/icon to plain text (extractText) instead of using
  // `source.serializePageTree()`, which renders via `react-dom/server.edge` — unsupported under RSC.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (): Promise<any> => ({
    pageTree: {
      $fumadocs_loader: 'page-tree' as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: visit(source.getPageTree(), (node: any) => {
        const flat = { ...node };
        if (flat.icon) flat.icon = extractText(flat.icon);
        if (flat.name) flat.name = extractText(flat.name);
        if (flat.children) flat.children = [...flat.children];
        return flat;
      }),
    },
  }),
);

const getDocContentSchema = z.object({ slug: z.array(z.string()) });

export const getDocContent = createServerFn({ method: 'GET' })
  .validator(getDocContentSchema)
  .handler(async ({ data: { slug } }) => {
    const page = source.getPage(slug);
    if (!page) throw notFound();

    const entry = docs.getPage(page.path);
    if (!entry) throw notFound();

    const { body: MDX, toc } = await entry.load();
    // Renders via RSC so the MDX component crosses the server-function boundary as a real, interactive element.
    const body = await renderServerComponent(
      <MDX components={getMDXComponents()} />,
    );

    // Heading text is JSX (e.g. `<>{"Introduction"}</>`); flatten to a plain string before returning.
    const flatToc = (toc as unknown as TOCItemType[]).map((item) => ({
      ...item,
      title: extractText(item.title),
    }));

    return {
      title: page.data.title as string,
      description: page.data.description as string | undefined,
      full: page.data.full as boolean | undefined,
      toc: flatToc,
      body,
    };
  });

function extractText(node: unknown): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return extractText(
      (node as { props?: { children?: unknown } }).props?.children,
    );
  }
  return '';
}
