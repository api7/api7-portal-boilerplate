import 'server-only';

import { source } from '@/lib/docs/source';

export type DocFrontmatter = {
  title: string;
  description?: string;
  order?: number;
};

export type DocPage = {
  slug: string[];
  frontmatter: DocFrontmatter;
};

export type SearchDoc = {
  href: string;
  title: string;
  description: string;
  headings: string[];
  text: string;
};

/** Slug arrays for `generateStaticParams`. The index page is `[]`. */
export function getDocSlugs(): string[][] {
  return source.getPages().map((p) => p.slugs);
}

/** Load a single doc's metadata by its URL slug. Returns null when not found. */
export function getDocBySlug(slug: string[]): DocPage | null {
  const page = source.getPage(slug);
  if (!page) return null;
  return {
    slug: page.slugs,
    frontmatter: {
      title: (page.data as { title: string }).title,
      description: (page.data as { description?: string }).description,
      order: (page.data as { order?: number }).order,
    },
  };
}

export type SearchSection = {
  id: string;
  url: string;
  type: 'page' | 'heading' | 'text';
  content: string;
  pageTitle: string;
  sectionTitle?: string;
};

type StructuredData = {
  headings: { id: string; content: string }[];
  contents: { heading?: string; content: string }[];
};

/** Build per-section search entries from every doc page. */
export function getSearchSections(): SearchSection[] {
  return source.getPages().flatMap((page) => {
    const data = page.data as { title: string; structuredData: StructuredData };
    const sd = data.structuredData;
    // id → human-readable text, for breadcrumb display and URL anchors
    const headingText = new Map(sd.headings.map((h) => [h.id, h.content]));
    const sections: SearchSection[] = [
      { id: page.url, url: page.url, type: 'page', content: data.title, pageTitle: data.title },
    ];
    for (const h of sd.headings) {
      if (h.content === data.title) continue;
      sections.push({
        id: `${page.url}#${h.id}`,
        url: `${page.url}#${h.id}`,
        type: 'heading',
        content: h.content,
        pageTitle: data.title,
      });
    }
    for (let i = 0; i < sd.contents.length; i++) {
      const c = sd.contents[i];
      if (!c.content.trim()) continue;
      sections.push({
        id: `${page.url}#c${i}`,
        url: c.heading ? `${page.url}#${c.heading}` : page.url,
        type: 'text',
        content: c.content,
        pageTitle: data.title,
        sectionTitle: c.heading ? headingText.get(c.heading) : undefined,
      });
    }
    return sections;
  });
}

/** @deprecated use getSearchSections */
export function getSearchDocuments(): SearchDoc[] {
  return source.getPages().map((page) => {
    const data = page.data as {
      title: string;
      description?: string;
      structuredData: StructuredData;
    };
    return {
      href: page.url,
      title: data.title,
      description: data.description ?? '',
      headings: data.structuredData.headings.map((h) => h.content),
      text: data.structuredData.contents.map((c) => c.content).join(' '),
    };
  });
}
