import { isAxiosError } from 'axios';
import { APIError } from 'better-auth';
import { APIError as SDKAPIError } from '@api7/portal-sdk';
import { NextResponse } from 'next/server';
import { ReqError } from '@/types/portal-sdk';

export const errToAPIError = (err: unknown): APIError => {
  const fallback = 'System Error. Please Contact the Administrator.';
  if (err instanceof APIError) return err;
  if (SDKAPIError.isAPIError(err)) {
    return new APIError('BAD_REQUEST', { message: err.message || fallback });
  }
  if (isAxiosError(err)) {
    const { message } = err.response?.data as ReqError;
    return new APIError('BAD_REQUEST', { message: message || fallback });
  }
  return new APIError('INTERNAL_SERVER_ERROR', { message: fallback });
};

export const errToNextResJson = (err: unknown) => {
  const apiError = errToAPIError(err);
  return NextResponse.json(
    { code: apiError.message },
    { status: apiError.statusCode }
  );
};
