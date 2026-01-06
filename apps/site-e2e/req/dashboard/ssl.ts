import { expect } from '@playwright/test';
import { A7Ctx } from './common';
import { API_SSLS } from './constant';

type SSL = {
  type: 'server';
  key: string;
  cert: string;
};
export const a7PostSSL = async (
  ctx: A7Ctx,
  gateway_group_id: string,
  d: SSL
) => {
  const data = { labels: { createdBy: 'devportal' }, ...d };
  const sslRes = await ctx.post(API_SSLS, {
    data,
    params: { gateway_group_id },
  });
  expect(sslRes.status()).toBe(200);
  return (await sslRes.json()) as ObjRes<SSL>;
};

export const a7DeleteSSL = async (
  ctx: A7Ctx,
  gateway_group_id: string,
  ssl_id: string
) => {
  const sslRes = await ctx.delete(`${API_SSLS}/${ssl_id}`, {
    params: { gateway_group_id },
  });
  expect(sslRes.status()).toBe(200);
};
