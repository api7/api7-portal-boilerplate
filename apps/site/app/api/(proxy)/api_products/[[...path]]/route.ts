import { NextRequest, NextResponse } from 'next/server';

import { API_PREFIX } from '@/constants/api-prefix';
import { portal } from '@/lib/portal-sdk/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path } = await context.params;
    const { searchParams } = request.nextUrl;

    const url = path?.length
      ? `${API_PREFIX}/api_products/${path.join('/')}`
      : `${API_PREFIX}/api_products`;

    const response = await portal.proxy({
      method: 'GET',
      url,
      params: Object.fromEntries(searchParams),
      validateStatus: () => true,
    });

    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    console.error(
      'Proxy network error:',
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { message: 'Proxy server error' },
      { status: 500 },
    );
  }
}
