import { createSlugger } from '@/lib/docs/slugify';

/**
 * Minimal rehype plugin that adds slug `id`s to h1–h6 (replaces rehype-slug).
 * Walks the hast tree manually so it needs no extra dependencies, and uses the
 * shared slugger so ids match the TOC's.
 */

type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  value?: string;
  children?: HastNode[];
};

const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function textOf(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textOf).join('');
}

export function rehypeHeadingIds() {
  return (tree: HastNode) => {
    const slug = createSlugger();
    const walk = (node: HastNode) => {
      if (node.type === 'element' && node.tagName && HEADINGS.has(node.tagName)) {
        node.properties ??= {};
        if (!node.properties.id) node.properties.id = slug(textOf(node));
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
