import { expect } from '@playwright/test';
import {
  Ctx,
  getActiveOrganizationId,
  getDefaultApplicationId,
  getOrganizationIdBySlug,
} from './common';
import { portalApiRequest } from './portal-api';

export const deleteCredential = async (
  ctx: Ctx,
  id: string,
  appId: string,
  orgSlug?: string,
) => {
  const organizationId = orgSlug
    ? await getOrganizationIdBySlug(ctx, orgSlug)
    : await getActiveOrganizationId(ctx);
  const deleteRes = await portalApiRequest(
    organizationId,
    'delete',
    `/api/applications/${appId}/credentials/${id}`,
  );
  expect(deleteRes.status()).toBe(204);
};

export const deleteCredentials = async (ctx: Ctx, ids?: string[], orgSlug?: string) => {
  const organizationId = orgSlug
    ? await getOrganizationIdBySlug(ctx, orgSlug)
    : await getActiveOrganizationId(ctx);
  const appId = await getDefaultApplicationId(ctx, orgSlug);
  const allIds = ids || [];
  if (!ids) {
    const getAllCredentials = await portalApiRequest(
      organizationId,
      'get',
      `/api/applications/${appId}/credentials`,
    );
    expect(getAllCredentials.status()).toBe(200);
    const allProducts = await getAllCredentials.json();
    allIds.push(...(allProducts.list || []).map(({ id }) => id));
  }
  return await Promise.allSettled(
    allIds.map((id) =>
      portalApiRequest(
        organizationId,
        'delete',
        `/api/applications/${appId}/credentials/${id}`,
      ).then((res) => expect(res.status()).toBe(204)),
    ),
  );
};
