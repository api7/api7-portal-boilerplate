import { source } from '@/lib/docs/source';

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
export async function getSearchSections(): Promise<SearchSection[]> {
  const perPage = await Promise.all(
    source.getPages().map(async (page) => {
      const data = page.data as {
        title: string;
        load: () => Promise<{ structuredData: StructuredData }>;
      };
      const { structuredData: sd } = await data.load();
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
    }),
  );
  return perPage.flat();
}
