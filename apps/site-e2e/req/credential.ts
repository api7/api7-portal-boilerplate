import { expect } from '@playwright/test';
import {
  Ctx,
  getActiveOrganizationSlug,
  getDefaultApplicationId,
} from './common';
import { API_APPLICATIONS, API_PREFIX } from '@site/constants/api-prefix';

export const getApiCredentials = (appId: string, orgSlug?: string) => {
  const base = orgSlug
    ? `${API_PREFIX}/${orgSlug}/applications`
    : API_APPLICATIONS;
  return `${base}/${appId}/credentials`;
};

export const deleteCredential = async (
  ctx: Ctx,
  id: string,
  appId: string,
  orgSlug?: string,
) => {
  const deleteRes = await ctx.delete(`${getApiCredentials(appId, orgSlug)}/${id}`);
  expect(deleteRes.status()).toBe(204);
};

export const deleteCredentials = async (ctx: Ctx, ids?: string[], orgSlug?: string) => {
  const actualSlug = orgSlug ?? (await getActiveOrganizationSlug(ctx));
  const appId = await getDefaultApplicationId(ctx, actualSlug);
  const allIds = ids || [];
  if (!ids) {
    const getAllCredentials = await ctx.get(getApiCredentials(appId, actualSlug));
    expect(getAllCredentials.status()).toBe(200);
    const allProducts = await getAllCredentials.json();
    allIds.push(...(allProducts.list || []).map(({ id }) => id));
  }
  return await Promise.allSettled(
    allIds.map((id) => deleteCredential(ctx, id, appId, actualSlug)),
  );
};
