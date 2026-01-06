import type { NextResponse } from 'next/server';

declare global {
  type ExtractNextResponseData<T> = T extends (
    ...args: unknown[]
  ) => Promise<NextResponse<infer U>>
    ? U
    : T extends (...args: unknown[]) => NextResponse<infer U>
    ? U
    : never;

  type DeepPartial<T> = T extends (...args: unknown[]) => unknown
    ? T
    : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
}
