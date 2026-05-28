import { expect } from '@playwright/test';
import { APIFormLabel } from '@site/types/utils';
import { isNil, omitBy } from 'lodash';
import qs from 'qs';

import { A7Ctx } from './common';
import { API_GATEWAY_GROUPS } from './constant';

type GatewayGroup = {
  type: 'api7_gateway';
  name: string;
  description?: string;
  labels?: APIFormLabel;
};
export const a7PostGateway = async (
  ctx: A7Ctx,
  data?: Partial<GatewayGroup>,
) => {
  const postGateway = await ctx.post(API_GATEWAY_GROUPS, {
    data: {
      type: 'api7_gateway',
      ...data,
    },
  });
  expect(postGateway.status()).toBe(200);
  return (await postGateway.json()) as ObjRes<GatewayGroup>;
};

export const a7DeleteGateway = async (ctx: A7Ctx, id: string) => {
  const deleteGateway = await ctx.delete(`${API_GATEWAY_GROUPS}/${id}`);
  expect(deleteGateway.status()).toBe(200);
};

export type GetDockerDeploymentScript = {
  gateway_group_id: string;
  image: string;
  name?: string;
  http_port?: number;
  https_port?: number;
  dp_manager_address?: string;
  extra_args?: string[];
};

const defaultData: Partial<GetDockerDeploymentScript> = {
  name: 'api7-ee-gateway-1',
  http_port: 9080,
  https_port: 9443,
  dp_manager_address: 'https://dp-manager:7943',
};

export const a7GetDockerDeploymentScript = async (
  ctx: A7Ctx,
  data: GetDockerDeploymentScript,
) => {
  const dpManagerAddress =
    data.dp_manager_address || defaultData.dp_manager_address;

  const updateSettingsRes = await ctx.put('/api/system_settings', {
    data: { dp_manager_address: [dpManagerAddress] },
  });
  expect(updateSettingsRes.status()).toBe(200);

  const search = qs.stringify(
    omitBy(
      {
        ...defaultData,
        ...data,
      },
      isNil,
    ),
    { arrayFormat: 'brackets' },
  );

  const scriptRes = await ctx.get(
    `/api/gateway_groups/${data.gateway_group_id}/deployment/docker?${search}`,
  );
  expect(scriptRes.status()).toBe(200);
  return scriptRes.text();
};
