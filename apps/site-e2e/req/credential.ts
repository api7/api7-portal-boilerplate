import { expect } from '@playwright/test';
import { Ctx, getDefaultApplicationId } from './common';
import { API_APPLICATIONS } from '@site/constants/api-prefix';

export const getApiCredentials = (appId: string) =>
  `${API_APPLICATIONS}/${appId}/credentials`;
export const deleteCredential = async (ctx: Ctx, id: string, appId: string) => {
  const deleteRes = await ctx.delete(`${getApiCredentials(appId)}/${id}`);
  expect(deleteRes.status()).toBe(204);
};
export const deleteCredentials = async (ctx: Ctx, ids?: string[]) => {
  const appId = await getDefaultApplicationId(ctx);
  const allIds = ids || [];
  if (!ids) {
    const getAllCredentials = await ctx.get(getApiCredentials(appId));
    expect(getAllCredentials.status()).toBe(200);
    const allProducts = await getAllCredentials.json();
    allIds.push(...(allProducts.list || []).map(({ id }) => id));
  }
  return await Promise.allSettled(
    allIds.map((id) => deleteCredential(ctx, id, appId))
  );
};
