import { rehypeCode } from 'fumadocs-core/mdx-plugins/rehype-code';
import { rehypeToc } from 'fumadocs-core/mdx-plugins/rehype-toc';
import { remarkHeading } from 'fumadocs-core/mdx-plugins/remark-heading';
import { remarkStructure } from 'fumadocs-core/mdx-plugins/remark-structure';
import { loader } from 'fumadocs-core/source';
import { pageSchema } from 'fumadocs-core/source/schema';
import { defineDocs } from 'fumadocs-mdx/macro';
import remarkGfm from 'remark-gfm';
import { z } from 'zod';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    async: true,
    schema: pageSchema.extend({
      llms: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to show the page in llms.txt and llms-full.txt'),
    }),
    mdxOptions: {
      // Custom `mdxOptions` replaces fumadocs-mdx's defaults entirely, so
      // the plugins that populate `structuredData` (search indexing),
      // heading slugs, code highlighting, and `toc` must be added back
      // explicitly. `exportAs` makes structuredData an MDX module export
      // instead of only living on the vfile; `rehypeToc` is what actually
      // exports `toc`. `rehypeCode` (not a generic highlighter like
      // rehype-pretty-code) is required specifically because the `pre` MDX
      // component from fumadocs-ui only merges cleanly with the figure
      // structure `rehypeCode` produces — anything else double-wraps in an
      // unstyled outer `<figure>`.
      remarkPlugins: [
        remarkGfm,
        remarkHeading,
        [remarkStructure, { exportAs: 'structuredData' }],
      ],
      rehypePlugins: [rehypeCode, rehypeToc],
    },
    postprocess: {
      // Stores processed Markdown in the bundle so getText('processed')
      // works at runtime without reading from the filesystem.
      includeProcessedMarkdown: true,
    },
  },
});

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});
