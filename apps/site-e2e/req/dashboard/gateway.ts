import { A7Ctx } from './common';
import { isNil, omitBy } from 'lodash';
import qs from 'qs';
import { expect } from '@playwright/test';
import { APIFormLabel } from '@site/types/utils';
import { API_GATEWAY_GROUPS } from './constant';
import { CLUSTER_NAME } from '../../constant';

type GatewayGroup = {
  type: 'api7_gateway';
  name: string;
  description?: string;
  labels?: APIFormLabel;
};
export const a7PostGateway = async (
  ctx: A7Ctx,
  data?: Partial<GatewayGroup>
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

export type GetHelmDeploymentScript = {
  gateway_group_id: string;
  replicas?: number;
  name?: string;
  namespace?: string;
  serviceAccount?: number;
  workers?: number;
  cpu_limit?: number;
  memory_limit?: string;
};

const defaultData: Partial<GetHelmDeploymentScript> = {
  replicas: 1,
  name: 'api7-ee-3-gateway',
  namespace: 'api7',
};

export const a7GetHelmDeploymentScript = async (
  ctx: A7Ctx,
  data: GetHelmDeploymentScript
) => {
  // set correct cp address
  await ctx.put('/api/system_settings', {
    data: { dp_manager_address: [`https://${CLUSTER_NAME}-dp-manager.api7.svc:7943`] },
  });
  // pre stringify params for correct array format
  const search = qs.stringify(
    omitBy(
      {
        ...defaultData,
        ...data,
        extra_values: [
          'apisix.image.pullPolicy=IfNotPresent',
          'api7ee.healthcheck_report_interval=5',
        ],
      },
      isNil
    ),
    { arrayFormat: 'brackets' }
  );
  // get create instance script
  const scriptRes = await ctx.get(
    `/api/gateway_groups/${data.gateway_group_id}/deployment/helm/script?${search}`
  );
  expect(scriptRes.status()).toBe(200);
  return scriptRes.text();
};
