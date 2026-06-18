import { API_PREFIX } from '@/constants/api-prefix';
import { portal } from '@/lib/portal-sdk/server';
import { ReqError } from '@/types/portal-sdk';
import { isAxiosError } from 'axios';
import { NextRequest, NextResponse } from 'next/server';

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
    });

    if (response.status === 404) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status || 500;
      if (status === 404) {
        return new NextResponse(null, { status: 404 });
      }
      const err = error.response?.data as ReqError | undefined;
      return NextResponse.json(err ?? { message: 'Internal server error' }, { status: err?.status || status });
    }
    console.error('Proxy request error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ message: 'Proxy server error' }, { status: 500 });
  }
}
