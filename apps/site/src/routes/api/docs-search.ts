import '@tanstack/react-start/server-only';

import { createFileRoute } from '@tanstack/react-router';

import { getSearchSections } from '@/lib/docs/content';

// Content is static after build, so the section list only needs computing once.
let sectionsPromise: ReturnType<typeof getSearchSections> | undefined;

async function getSearchIndex() {
  sectionsPromise ??= getSearchSections();
  return Response.json(await sectionsPromise, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}

export const Route = createFileRoute('/api/docs-search')({
  server: {
    handlers: { GET: getSearchIndex },
  },
});
