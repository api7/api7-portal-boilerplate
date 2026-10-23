import { notFound } from '@tanstack/react-router';

import { source } from './source';

export function getDocPageMeta(slug: string[]) {
  const page = source.getPage(slug);
  if (!page) throw notFound();
  return { title: page.data.title, description: page.data.description };
}
