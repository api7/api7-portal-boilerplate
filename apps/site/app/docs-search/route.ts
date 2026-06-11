import { NextResponse } from 'next/server';

import { getSearchDocuments } from '@/lib/docs/content';

// Serves the docs search index as JSON. Lives at /docs-search (NOT /api, which
// the backend proxy owns). Built on demand from the MDX files and cached; the
// browser fetches it once and runs MiniSearch locally — no search backend.
export function GET() {
  return NextResponse.json(getSearchDocuments(), {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
