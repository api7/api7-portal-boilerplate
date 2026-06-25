import { NextResponse } from 'next/server';

import { getSearchSections } from '@/lib/docs/content';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(getSearchSections(), {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
  });
}
