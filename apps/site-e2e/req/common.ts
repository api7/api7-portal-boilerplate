import { APIRequest, expect, request } from '@playwright/test';
import { E2E_TARGET_URL } from '../constant';
import { API_APPLICATIONS, AUTH_BASE_PATH } from '@site/constants/api-prefix';
import { BetterAuthLogin } from './type';

export const genCtx = async (
  options?: Parameters<APIRequest['newContext']>[0]
) => {
  return await request.newContext({
    baseURL: E2E_TARGET_URL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      // required by better-auth API
      origin: E2E_TARGET_URL,
    },
    ...options,
  });
};

export type Ctx = Awaited<ReturnType<typeof genCtx>>;

export const getSession = async (ctx: Ctx) =>
  ctx.get(`${AUTH_BASE_PATH}/get-session`, { failOnStatusCode: false });

/**
 * Login using better-auth API (new Developer Portal)
 */
export const login = async (ctx: Ctx, auth: BetterAuthLogin) => {
  // Try to sign in first
  const signInRes = await ctx.post(`${AUTH_BASE_PATH}/sign-in/email`, {
    data: {
      email: auth.email,
      password: auth.password,
      name: auth.name,
    },
    failOnStatusCode: false,
  });

  if (signInRes.status() === 200) {
    return;
  }

  // If sign in fails, try to sign up
  const signUpRes = await ctx.post(`${AUTH_BASE_PATH}/sign-up/email`, {
    data: {
      email: auth.email,
      password: auth.password,
      name: auth.name,
    },
    failOnStatusCode: false,
  });

  if (signUpRes.status() === 200) {
    return;
  }

  // If both fail, throw error
  const signInBody = await signInRes.text();
  const signUpBody = await signUpRes.text();
  throw new Error(
    `Login failed. Sign-in: ${signInRes.status()} ${signInBody}, Sign-up: ${signUpRes.status()} ${signUpBody}`
  );
};

/**
 * Register a new user using better-auth API
 */
export const register = async (
  ctx: Ctx,
  auth: { email: string; password: string; name: string }
) => {
  const res = await ctx.post(`${AUTH_BASE_PATH}/sign-up/email`, {
    data: auth,
  });
  expect(res.status()).toBe(200);
  return res.json();
};

export const deleteAllApplications = async (ctx: Ctx) => {
  const applications = await ctx.get(API_APPLICATIONS);
  expect(applications.status()).toBe(200);
  const applicationsData = await applications.json();
  for (const application of applicationsData.list || []) {
    await ctx.delete(`${API_APPLICATIONS}/${application.id}`);
  }
};

export const deleteAllOrganizations = async (ctx: Ctx) => {
  const res = await ctx.get(`${AUTH_BASE_PATH}/organization/list`, {
    failOnStatusCode: false,
  });
  const status = res.status();
  const orgList = await res.json();
  expect(status).toBe(200);

  for (const org of orgList) {
    await ctx.post(`${AUTH_BASE_PATH}/organization/delete`, {
      data: {
        organizationId: org.id,
      },
      failOnStatusCode: true,
    });
  }
};
export const getDefaultApplicationId = async (ctx: Ctx): Promise<string> => {
  const res = await ctx.get(API_APPLICATIONS);
  expect(res.status()).toBe(200);
  const data = await res.json();
  const defaultApp = data.list?.find(
    (app: { name: string }) => app.name === 'default'
  );
  return defaultApp.id;
};

export const createApplication = async (
  ctx: Ctx,
  data: { name: string; desc?: string }
) => {
  const res = await ctx.post(API_APPLICATIONS, {
    data,
    failOnStatusCode: false,
  });
  const status = res.status();
  expect(status).toBe(201);
  return res.json();
};

// ref: https://www.better-auth.com/docs/plugins/organization
export const createOrganization = async (ctx: Ctx, name: string) => {
  // ensure the below new organization is the only one which will be activated
  await deleteAllOrganizations(ctx);
  console.log('Creating organization:', name);
  const res = await ctx.post(`${AUTH_BASE_PATH}/organization/create`, {
    data: {
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      keepCurrentActiveOrganization: false,
    },
    failOnStatusCode: false,
  });
  const status = res.status();
  const body = await res.json();
  expect(status).toBe(200);
  const sessionRes = await getSession(ctx);
  const sessionBody = await sessionRes.json();
  expect(sessionBody.session.activeOrganizationId).toBe(body.id);
  await createApplication(ctx, { name: 'default' });
  return body;
};
