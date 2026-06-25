import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import rehypePrettyCode from 'rehype-pretty-code';
import remarkGfm from 'remark-gfm';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
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
