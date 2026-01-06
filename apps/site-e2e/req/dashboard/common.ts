import { APIRequest, expect, request } from '@playwright/test';
import { ONETIME_PASSWORD } from '../../constant';
import { API_ME } from './constant';
import { API_PORTALS, API_PROVIDER_PUBLIC_ACCESS } from './constant';
import { API_DEVELOPERS } from '@site/constants/api-prefix';
import { A7Login } from './type';

export const a7GenCtx = async (
  options?: Parameters<APIRequest['newContext']>[0]
) => {
  const { A7_URL } = process.env;
  if (!A7_URL) throw new Error('env A7_URL is not set');
  const ctx = await request.newContext({ baseURL: A7_URL, ...options });
  return ctx;
};

export type A7Ctx = Awaited<ReturnType<typeof a7GenCtx>>;

export const a7LicenseActivated = async (ctx: A7Ctx) => {
  const license = await ctx.get(`/api/license`, { failOnStatusCode: false });
  if (license.status() !== 200) {
    console.log('license', license.status(), (await license.body()).toString());
  }
  return license.status() === 200;
};

export const a7LicenseActivate = async (ctx: A7Ctx) => {
  if (await a7LicenseActivated(ctx)) return;
  if (!process.env.BACKEND_API7_LICENSE) {
    throw new Error('env BACKEND_API7_LICENSE is not set');
  }

  const activateLicense = await ctx.put(`/api/license`, {
    data: { data: process.env.BACKEND_API7_LICENSE },
  });
  expect(activateLicense.status()).toBe(200);
};

export const a7LoggedIn = async (ctx: A7Ctx) => {
  const me = await ctx.get(API_ME, { failOnStatusCode: false });
  return me.status() === 200;
};

export const a7ActivateLicenseAndChangePasswd = async (ctx: A7Ctx) => {
  const { A7_ROOT_USERNAME, A7_ROOT_PASSWORD } = process.env;
  if (!A7_ROOT_USERNAME) throw new Error('env A7_ROOT_USERNAME is not set');
  if (!A7_ROOT_PASSWORD) throw new Error('env A7_ROOT_PASSWORD is not set');
  if (!ONETIME_PASSWORD) throw new Error('env ONETIME_PASSWORD is not set');

  if (await a7LoggedIn(ctx)) return;

  const adminLogin = {
    username: A7_ROOT_USERNAME,
    password: A7_ROOT_PASSWORD,
  };
  const login = await ctx.post('/api/login', {
    data: adminLogin,
    failOnStatusCode: false,
  });

  if (login.status() === 200) return;

  const tmpA7Ctx = await a7GenCtx({
    httpCredentials: {
      username: A7_ROOT_USERNAME,
      password: ONETIME_PASSWORD,
      send: 'always',
    },
  });
  const resetPasswd = await tmpA7Ctx.put('/api/password', {
    data: { new_password: A7_ROOT_PASSWORD },
  });
  expect(resetPasswd.status()).toBe(200);
  tmpA7Ctx.dispose();

  const loginAgain = await ctx.post('/api/login', {
    data: adminLogin,
  });

  expect(loginAgain.status()).toBe(200);
  expect(loginAgain.json()).not.toHaveProperty('warning_msg');

  await a7LicenseActivate(ctx);
};

/** this will auto use ONETIME_PASSWORD */
export const a7InviteDev = async (ctx: A7Ctx, auth: A7Login) => {
  const portalID = await a7DefaultPortalID(ctx);
  const url = `${API_DEVELOPERS}/invites?portal_id=${portalID}`;
  const invite = await ctx.post(url, {
    data: {
      username: auth.username,
      password: ONETIME_PASSWORD,
    },
  });
  expect(invite.status()).toBe(200);
};
export const a7PutPublicAccess = async (ctx: A7Ctx, status: boolean) => {
  const data = { portal_public_access: status };
  const portalID = await a7DefaultPortalID(ctx);
  const putPublicAccess = await ctx.put(
    `${API_PROVIDER_PUBLIC_ACCESS}?portal_id=${portalID}`,
    { data }
  );
  expect(putPublicAccess.status()).toBe(200);
};

export const a7DefaultPortalID = async (ctx: A7Ctx) => {
  const listPortals = await ctx.get(`${API_PORTALS}?search=default`, {
    failOnStatusCode: false,
  });
  const portalId = (await listPortals.json()).list[0]?.id;

  if (portalId) {
    return portalId;
  }

  const res = await ctx.post(API_PORTALS, {
    data: {
      name: 'default',
      labels: {
        env: 'prod',
      },
      domain: 'localhost',
    },
  });
  return (await res.json()).value.id;
};
