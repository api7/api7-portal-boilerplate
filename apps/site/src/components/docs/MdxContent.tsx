import 'server-only';

import { compile, run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import rehypePrettyCode from 'rehype-pretty-code';
import remarkGfm from 'remark-gfm';

import { rehypeHeadingIds } from '@/lib/docs/rehype-heading-ids';
import { mdxComponents } from '@/components/docs/mdx-components';

// Compiled code is cached per process — docs are static files that never
// change at runtime, so this is safe and avoids re-running the full
// remark/rehype pipeline on every request.
const compileCache = new Map<string, string>();

async function getCompiledCode(source: string): Promise<string> {
  const cached = compileCache.get(source);
  if (cached) return cached;

  const vfile = await compile(source, {
    outputFormat: 'function-body',
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeHeadingIds,
      [
        rehypePrettyCode,
        {
          theme: { light: 'github-light', dark: 'github-dark' },
          keepBackground: true,
        },
      ],
    ],
  });

  const code = String(vfile);
  compileCache.set(source, code);
  return code;
}

export default async function MdxContent({ source }: { source: string }) {
  const code = await getCompiledCode(source);
  const { default: MDXContent } = await run(code, {
    ...runtime,
    baseUrl: import.meta.url,
  });

  return <MDXContent components={mdxComponents} />;
}
