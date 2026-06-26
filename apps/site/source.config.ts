import { pageSchema } from 'fumadocs-core/source/schema';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import rehypePrettyCode from 'rehype-pretty-code';
import remarkGfm from 'remark-gfm';
import { z } from 'zod';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema.extend({
      llms: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to show the page in llms.txt and llms-full.txt'),
    }),
    postprocess: {
      // Stores processed Markdown in the bundle so getText('processed')
      // works at runtime without reading from the filesystem.
      includeProcessedMarkdown: true,
    },
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          theme: { light: 'github-light', dark: 'github-dark' },
          keepBackground: true,
        },
      ],
    ],
  },
});
