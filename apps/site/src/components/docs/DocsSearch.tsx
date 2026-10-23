'use client';

import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SearchItemType,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import MiniSearch from 'minisearch';
import { useMemo, useState } from 'react';

import { type SearchSection, getSearchSections } from '@/lib/docs/content';

function highlight(text: string | undefined, terms: string[]): string {
  if (!text) return '';
  if (!terms.length) return text;
  const escaped = terms
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

let searchIndex: MiniSearch<SearchSection> | undefined;

function getSearchIndex(): MiniSearch<SearchSection> {
  if (searchIndex) return searchIndex;
  const ms = new MiniSearch<SearchSection>({
    fields: ['content'],
    storeFields: ['url', 'type', 'content', 'pageTitle', 'sectionTitle'],
    searchOptions: { prefix: true, fuzzy: 0.2 },
  });
  ms.addAll(getSearchSections());
  searchIndex = ms;
  return ms;
}

export default function DocsSearch({
  open,
  onOpenChange,
  dialogHandle,
}: SharedProps) {
  const [search, setSearch] = useState('');

  const mini = useMemo(() => (open ? getSearchIndex() : null), [open]);

  const items = useMemo((): SearchItemType[] | null => {
    if (!search.trim() || !mini) return null;
    const hits = mini.search(search).slice(0, 12);
    if (!hits.length) return [];
    return hits.map((r): SearchItemType => ({
      id: r.id as string,
      url: r.url as string,
      type: r.type as 'page' | 'heading' | 'text',
      content: highlight(r.content as string, r.terms),
      breadcrumbs:
        r.type !== 'text'
          ? undefined
          : [
              r.pageTitle as string,
              ...(r.sectionTitle ? [r.sectionTitle as string] : []),
            ],
    }));
  }, [mini, search]);

  return (
    <SearchDialog
      open={open}
      onOpenChange={onOpenChange}
      dialogHandle={dialogHandle}
      search={search}
      onSearchChange={setSearch}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput placeholder="Search documentation…" />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={items} />
      </SearchDialogContent>
    </SearchDialog>
  );
}
