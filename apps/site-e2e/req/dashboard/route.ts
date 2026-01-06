import { expect } from '@playwright/test';
import { A7Ctx } from './common';
import { API_PUBLISHED_ROUTES } from './constant';

export type HTTPMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS'
  | 'HEAD'
  | 'CONNECT'
  | 'TRACE';

type Route = {
  name: string;
  labels?: Record<string, string>;
  service_id: string;
  paths: string[];
  desc?: string;
  methods?: HTTPMethod[];
};
export const a7PostPublishedRoute = async (
  ctx: A7Ctx,
  gateway_group_id: string,
  data: Route
) => {
  const routeRes = await ctx.post(API_PUBLISHED_ROUTES, {
    data,
    params: { gateway_group_id },
  });
  expect(routeRes.status()).toBe(200);
  return (await routeRes.json()) as ObjRes<Route>;
};

export const a7DeletePublishedRoute = async (
  ctx: A7Ctx,
  route_id: string,
  gateway_group_id: string
) => {
  const routeRes = await ctx.delete(`${API_PUBLISHED_ROUTES}/${route_id}`, {
    params: { gateway_group_id },
  });
  expect(routeRes.status()).toBe(200);
};
