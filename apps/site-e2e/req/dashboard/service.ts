import { A7Ctx } from './common';
import { APIFormLabel } from '@site/types/utils';
import { expect } from '@playwright/test';
import { API_PUBLISHED_SERVICES, API_GATEWAY_GROUPS } from './constant';

enum ActiveStatus {
  active = 1,
  inactive = 0,
}

type Service = {
  name: string;
  status: ActiveStatus;
  upstream: any;
  type: 'http' | 'stream';
} & Partial<{
  hosts: string[];
  path_prefix: string;
  labels: APIFormLabel;
  desc: string;
  plugins: object;
}>;

export const a7PostPublishedService = async (
  ctx: A7Ctx,
  gateway_group_id: string,
  data?: Partial<Service>
) => {
  const postService = await ctx.post(API_PUBLISHED_SERVICES, {
    params: { gateway_group_id },
    data: {
      ...{
        name: 'test',
        labels: { test: 'test' },
        type: 'http',
        upstream: {
          name: 'default',
          scheme: data?.type === 'stream' ? 'tcp' : 'http',
          type: 'roundrobin',
          nodes: [
            {
              host: '12.12.12.12',
              port: 80,
              weight: 0,
            },
          ],
          timeout: {},
        },
        plugins: {},
        desc: 'desc',
        status: ActiveStatus.active,
      },
      ...data,
    },
  });
  expect(postService.status()).toBe(200);
  return (await postService.json()) as ObjRes<Service>;
};

export const a7DeleteService = async (
  ctx: A7Ctx,
  service_id: string,
  gateway_group_id: string
) => {
  const deleteService = await ctx.delete(
    `${API_PUBLISHED_SERVICES}/${service_id}`,
    {
      params: { gateway_group_id },
    }
  );
  expect(deleteService.status()).toBe(200);
};

export const a7PutServiceOAS = async (
  ctx: A7Ctx,
  gateway_group_id: string,
  service_id: string,
  raw_openapi: string
) => {
  const putService = await ctx.put(
    `${API_GATEWAY_GROUPS}/${gateway_group_id}/services/${service_id}/oas`,
    { data: { raw_openapi } }
  );
  expect(putService.status()).toBe(200);
};
