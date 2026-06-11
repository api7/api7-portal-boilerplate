import 'server-only';

import { type Dirent, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import { createSlugger } from '@/lib/docs/slugify';

/**
 * File-backed docs content.
 *
 * Markdown/MDX lives in `content/docs/**` (outside `app/`). Adding a doc is
 * just dropping an `.mdx` file with frontmatter — the sidebar and routes derive
 * from the filesystem, so there is no registry to maintain.
 *
 * The docs routes render dynamically (the shared Header reads cookies), so
 * these helpers run at request time; `content/**` is bundled into the
 * standalone server via `outputFileTracingIncludes` in next.config.ts.
 */

const CONTENT_DIR = join(process.cwd(), 'content');
const DOCS_DIR = join(CONTENT_DIR, 'docs');

const MDX_EXTENSIONS = ['.mdx', '.md'];

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Frontmatter schema. Validated at parse time so a missing/mistyped field
 * fails loudly (with the file name) during build/dev instead of silently
 * rendering wrong — the type-safe-content idea borrowed from Contentlayer,
 * using the zod the app already ships.
 */
const FrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  /** Lower sorts higher among its siblings in the sidebar. Defaults to 100. */
  order: z.number().optional(),
});

export type DocFrontmatter = z.infer<typeof FrontmatterSchema>;

/**
 * Split a leading `---` YAML frontmatter block from the body (replaces
 * gray-matter using the `yaml` dependency the app already ships) and validate
 * it. `label` identifies the file in error messages.
 */
function parseFrontmatter(
  raw: string,
  label: string
): { content: string; data: DocFrontmatter } {
  const match = FRONTMATTER_RE.exec(raw);
  const body = match ? raw.slice(match[0].length) : raw;
  let parsed: unknown = {};
  if (match) {
    try {
      parsed = parseYaml(match[1]) ?? {};
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid frontmatter in ${label} — YAML error: ${message}`);
    }
  }
  const result = FrontmatterSchema.safeParse(parsed);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid frontmatter in ${label} — ${detail}`);
  }
  return { content: body, data: result.data };
}

export type DocHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

export type DocPage = {
  slug: string[];
  /** Raw MDX body with frontmatter stripped. */
  source: string;
  frontmatter: DocFrontmatter;
  headings: DocHeading[];
};

/** A clickable doc page in the sidebar tree. */
export type DocLeaf = {
  type: 'doc';
  title: string;
  href: string;
  order: number;
};

/** A directory grouping in the sidebar tree (may nest arbitrarily deep). */
export type DocSection = {
  type: 'section';
  title: string;
  order: number;
  children: DocNode[];
};

export type DocNode = DocLeaf | DocSection;

type DocFile = { absPath: string; slug: string[] };

/** Recursively collect every markdown file under `content/docs`. */
function walkDocs(dir = DOCS_DIR): DocFile[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    // No content/docs directory yet — treat as empty.
    return [];
  }

  return entries.flatMap((entry) => {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) return walkDocs(abs);

    const ext = MDX_EXTENSIONS.find((e) => entry.name.endsWith(e));
    if (!ext) return [];

    // `content/docs/guides/auth.mdx` -> ['guides', 'auth']; `index` -> [].
    const rel = relative(DOCS_DIR, abs).slice(0, -ext.length);
    const slug = rel.split(sep).filter((s) => s && s !== 'index');
    return [{ absPath: abs, slug }];
  });
}

/** Strip the inline Markdown a heading might contain, for display + slugging. */
function cleanHeadingText(raw: string): string {
  return raw
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links
    .trim();
}

/**
 * Extract H2/H3 headings for the on-page TOC, skipping fenced code blocks.
 * Uses the shared slugger so ids match those the heading-id rehype plugin
 * generates at render.
 */
function extractHeadings(markdown: string): DocHeading[] {
  const slug = createSlugger();
  const headings: DocHeading[] = [];
  let inFence = false;

  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length as 2 | 3;
    const text = cleanHeadingText(match[2]);
    if (!text) continue;
    headings.push({ id: slug(text), text, level });
  }

  return headings;
}

/** Slug arrays for `generateStaticParams`. The index page is `[]`. */
export function getDocSlugs(): string[][] {
  return walkDocs().map((d) => d.slug);
}

/** Load a single doc by its URL slug. Returns null when not found. */
export function getDocBySlug(slug: string[]): DocPage | null {
  const target = slug.join('/');
  const file = walkDocs().find((d) => d.slug.join('/') === target);
  if (!file) return null;

  const raw = readFileSync(file.absPath, 'utf-8');
  const { content, data } = parseFrontmatter(raw, file.absPath);
  return {
    slug: file.slug,
    source: content,
    frontmatter: data,
    headings: extractHeadings(content),
  };
}

/** Turn a directory name into a readable section title: `getting-started` -> `Getting Started`. */
function humanize(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const sortNodes = (nodes: DocNode[]): DocNode[] =>
  nodes.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

/**
 * Build the sidebar as a tree mirroring the `content/docs` directory layout.
 * Sub-directories become nested sections (any depth); files become links.
 * Within each level, items sort by frontmatter `order` then title; a section
 * inherits the smallest `order` of its children so you can float a whole
 * section up by ordering a page inside it.
 */
function buildTree(dir = DOCS_DIR): DocNode[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: DocNode[] = [];
  for (const entry of entries) {
    const abs = join(dir, entry.name);

    if (entry.isDirectory()) {
      const children = buildTree(abs);
      if (children.length === 0) continue;
      nodes.push({
        type: 'section',
        title: humanize(entry.name),
        order: Math.min(...children.map((c) => c.order)),
        children,
      });
      continue;
    }

    const ext = MDX_EXTENSIONS.find((e) => entry.name.endsWith(e));
    if (!ext) continue;

    const rel = relative(DOCS_DIR, abs).slice(0, -ext.length);
    const slug = rel.split(sep).filter((s) => s && s !== 'index');
    const { data: fm } = parseFrontmatter(readFileSync(abs, 'utf-8'), abs);
    nodes.push({
      type: 'doc',
      title: fm.title || humanize(slug[slug.length - 1] || 'introduction'),
      href: slug.length ? `/docs/${slug.join('/')}` : '/docs',
      order: fm.order ?? 100,
    });
  }

  return sortNodes(nodes);
}

/** Nested sidebar tree mirroring the content/docs directory structure. */
export function getDocsTree(): DocNode[] {
  return buildTree();
}

/**
 * Flat, reading-order list of all doc pages (depth-first over the tree) — used
 * for the previous/next pager at the bottom of each page.
 */
export function getDocsNav(): DocLeaf[] {
  const flat: DocLeaf[] = [];
  const walk = (nodes: DocNode[]) => {
    for (const node of nodes) {
      if (node.type === 'doc') flat.push(node);
      else walk(node.children);
    }
  };
  walk(buildTree());
  return flat;
}

export type SearchDoc = {
  /** Page URL, also used as the MiniSearch id. */
  href: string;
  title: string;
  description: string;
  /** H2/H3 heading texts, for matching and result context. */
  headings: string[];
  /** Plain-text body (Markdown/MDX syntax stripped). */
  text: string;
};

/** Reduce Markdown/MDX to searchable plain text. */
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/<\/?[A-Za-z][^>]*>/g, ' ') // JSX/HTML tags (e.g. <Callout>)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> text
    .replace(/`([^`]+)`/g, '$1') // inline code -> text
    .replace(/^#{1,6}\s+/gm, '') // heading markers
    .replace(/[*_~>|]/g, ' ') // emphasis / blockquote / table pipes
    .replace(/\s+/g, ' ')
    .trim();
}

/** Build the search index documents from every doc page. */
export function getSearchDocuments(): SearchDoc[] {
  return walkDocs().map(({ absPath, slug }): SearchDoc => {
    const { content, data: fm } = parseFrontmatter(
      readFileSync(absPath, 'utf-8'),
      absPath
    );
    return {
      href: slug.length ? `/docs/${slug.join('/')}` : '/docs',
      title: fm.title || humanize(slug[slug.length - 1] || 'introduction'),
      description: fm.description ?? '',
      headings: extractHeadings(content).map((h) => h.text),
      text: stripMarkdown(content),
    };
  });
}
