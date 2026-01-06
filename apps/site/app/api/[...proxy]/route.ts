import { NextRequest, NextResponse } from 'next/server';
import { portal } from '@/lib/portal-sdk/server';
import { API_PREFIX } from '@/constants/api-prefix';
import { isAxiosError } from 'axios';
import { ReqError } from '@/types/portal-sdk';

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ proxy: string[] }> }
) {
  try {
    const { proxy } = await context.params;
    const path = `${API_PREFIX}/${proxy.join('/')}`;
    const { searchParams } = request.nextUrl;

    const config: {
      params: Record<string, string>;
      data?: unknown;
      headers?: Record<string, string>;
    } = {
      params: Object.fromEntries(searchParams),
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        config.data = await request.json();
      } else if (contentType) {
        config.data = await request.text();
      }
    }

    const response = await portal.proxy({
      method: request.method,
      url: path,
      ...config,
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    if (isAxiosError(error)) {
      const err = error.response?.data as ReqError;
      return NextResponse.json(err, { status: err.status || 500 });
    }
    console.error('Proxy request error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export {
  proxyRequest as GET,
  proxyRequest as POST,
  proxyRequest as PUT,
  proxyRequest as DELETE,
  proxyRequest as PATCH,
};
