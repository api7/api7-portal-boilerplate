import { expect } from '@playwright/test';

import { diffPatch } from '../../utils/helper';
import { A7Ctx, a7DefaultPortalID } from './common';
import { API_DCR_PROVIDERS, API_PROVIDER_LOGIN_OPTIONS } from './constant';
import { LoginOptionListItem } from './type';

export const a7PostLoginOption = async (
  ctx: A7Ctx,
  data: DeepPartial<LoginOptionListItem>,
) => {
  const portalID = await a7DefaultPortalID(ctx);
  const postLoginOption = await ctx.post(
    `${API_PROVIDER_LOGIN_OPTIONS}?portal_id=${portalID}`,
    { data },
  );
  expect(postLoginOption.status()).toBe(200);
  return (await postLoginOption.json()) as ObjRes<LoginOptionListItem>;
};

export const a7GetLoginOptions = async (ctx: A7Ctx) => {
  const portalID = await a7DefaultPortalID(ctx);
  const getLoginOptions = await ctx.get(
    `${API_PROVIDER_LOGIN_OPTIONS}?portal_id=${portalID}`,
  );
  expect(getLoginOptions.status()).toBe(200);
  return (await getLoginOptions.json()) as ListRes<LoginOptionListItem>;
};

export const a7GetLoginOptionBuiltIn = async (ctx: A7Ctx) => {
  const loginOptions = await a7GetLoginOptions(ctx);
  return loginOptions.list.find((d) => d.provider_type === 'built_in');
};

export const a7PatchLoginOption = async (
  ctx: A7Ctx,
  id: string,
  oldData: DeepPartial<LoginOptionListItem>,
  newData: DeepPartial<LoginOptionListItem>,
) => {
  const portalID = await a7DefaultPortalID(ctx);
  const patchLoginOption = await ctx.patch(
    `${API_PROVIDER_LOGIN_OPTIONS}/${id}?portal_id=${portalID}`,
    { data: diffPatch(oldData, newData) },
  );
  expect(patchLoginOption.status()).toBe(200);
  return (await patchLoginOption.json()) as ObjRes<LoginOptionListItem>;
};

export const a7DeleteLoginOptionByName = async (
  ctx: A7Ctx,
  name: string | RegExp,
) => {
  const portalID = await a7DefaultPortalID(ctx);
  const getAllLoginOptions = await ctx.get(
    `${API_PROVIDER_LOGIN_OPTIONS}?portal_id=${portalID}`,
  );
  expect(getAllLoginOptions.status()).toBe(200);
  const loginOptions =
    (await getAllLoginOptions.json()) as ListRes<LoginOptionListItem>;
  const targetOptions = loginOptions.list.filter((option) => {
    if (typeof name === 'string') return option.name.startsWith(name);
    else return name.test(option.name);
  });
  await Promise.allSettled(
    (targetOptions || []).map(async (option) => {
      await ctx.delete(`${API_PROVIDER_LOGIN_OPTIONS}/${option.id}`);
    }),
  );
};

export const a7DeleteDCRProviderList = async (ctx: A7Ctx) => {
  const allIds = [];
  const getAllProviders = await ctx.get(API_DCR_PROVIDERS);
  const allProviders = (await getAllProviders.json()) as ListRes<{}>;
  allIds.push(...(allProviders.list || []).map(({ id }) => id));
  return await Promise.allSettled(
    allIds.map((id) => ctx.delete(`${API_DCR_PROVIDERS}/${id}`)),
  );
};

export const a7GetDCRProviderList = async (ctx: A7Ctx) => {
  const getAllProviders = await ctx.get(API_DCR_PROVIDERS);
  expect(getAllProviders.status()).toBe(200);
  return (await getAllProviders.json()) as ListRes<{
    id: string;
    name: string;
  }>;
};
