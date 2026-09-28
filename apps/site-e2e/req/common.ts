import { APIRequest, expect, request } from '@playwright/test';
import type { Page } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';
import { PATH_LANDING } from '@site/constants/path-prefix';

import { E2E_TARGET_URL } from '../constant';
import { portalApiRequest } from './portal-api';
import { BetterAuthLogin } from './type';

const ORG_SET_ACTIVE = `${AUTH_BASE_PATH}/organization/set-active`;

export const genCtx = async (
  options?: Parameters<APIRequest['newContext']>[0],
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
  // Force a fresh DB read: cookieCache means the plain endpoint can return a
  // snapshot from before a just-completed mutation (e.g. org creation sets
  // activeOrganizationId by writing the session row directly, bypassing the
  // cache) — tests want ground truth, not the perf-optimized cached read.
  ctx.get(`${AUTH_BASE_PATH}/get-session?disableCookieCache=true`, {
    failOnStatusCode: false,
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const maxRequestRetries = 5;

const isTransientNetworkError = (err: unknown) => {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('socket hang up') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('econnrefused')
  );
};

const isRetryableStatus = (status: number) => status === 429 || status >= 500;

/**
 * Login using better-auth API (new Developer Portal).
 * Retries on 429 (rate limit) responses and on socket/network errors.
 */
export const login = async (ctx: Ctx, auth: BetterAuthLogin) => {
  const maxRetries = 5;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const signInRes = await ctx.post(`${AUTH_BASE_PATH}/sign-in/email`, {
        data: {
          email: auth.email,
          password: auth.password,
          name: auth.name,
        },
        failOnStatusCode: false,
        timeout: 30000,
      });

      if (signInRes.status() === 200) return;

      if (signInRes.status() === 429) {
        await sleep(2000 * (attempt + 1));
        continue;
      }

      const signUpRes = await ctx.post(`${AUTH_BASE_PATH}/sign-up/email`, {
        data: {
          email: auth.email,
          password: auth.password,
          name: auth.name,
        },
        failOnStatusCode: false,
        timeout: 30000,
      });

      if (signUpRes.status() === 200) return;

      const signUpBody = await signUpRes.text();

      if (signUpRes.status() === 429) {
        await sleep(2000 * (attempt + 1));
        continue;
      }

      const signInBody = await signInRes.text();
      throw new Error(
        `Login failed. Sign-in: ${signInRes.status()} ${signInBody}, Sign-up: ${signUpRes.status()} ${signUpBody}`,
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (isTransientNetworkError(lastError)) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      throw lastError;
    }
  }

  try {
    const signInRes = await ctx.post(`${AUTH_BASE_PATH}/sign-in/email`, {
      data: {
        email: auth.email,
        password: auth.password,
        name: auth.name,
      },
      failOnStatusCode: false,
      timeout: 30000,
    });
    if (signInRes.status() === 200) return;
    const signInBody = await signInRes.text();
    throw new Error(
      `Login failed after ${maxRetries} retries. Sign-in: ${signInRes.status()} ${signInBody}`,
    );
  } catch (err) {
    throw lastError ?? err;
  }
};

/**
 * Register a new user using better-auth API.
 * Retries on 429 (rate limit) and network errors.
 */
export const register = async (
  ctx: Ctx,
  auth: { email: string; password: string; name: string },
) => {
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await ctx.post(`${AUTH_BASE_PATH}/sign-up/email`, {
        data: auth,
        failOnStatusCode: false,
        timeout: 30000,
      });

      if (res.status() === 200) return res.json();

      const body = await res.text();
      if (res.status() === 429) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      throw new Error(`Register failed: ${res.status()} ${body}`);
    } catch (err) {
      if (isTransientNetworkError(err)) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  const res = await ctx.post(`${AUTH_BASE_PATH}/sign-up/email`, {
    data: auth,
    failOnStatusCode: false,
    timeout: 30000,
  });
  expect(res.status()).toBe(200);
  return res.json();
};

export const deleteAllApplications = async (ctx: Ctx, orgSlug?: string) => {
  const organizationId = orgSlug
    ? await getOrganizationIdBySlug(ctx, orgSlug)
    : await getActiveOrganizationId(ctx);
  const applications = await portalApiRequest(organizationId, 'get', '/api/applications');
  expect(applications.status()).toBe(200);
  const applicationsData = await applications.json();
  for (const application of applicationsData.list || []) {
    await portalApiRequest(organizationId, 'delete', `/api/applications/${application.id}`);
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
export const getDefaultApplicationId = async (ctx: Ctx, orgSlug?: string): Promise<string> => {
  const organizationId = orgSlug
    ? await getOrganizationIdBySlug(ctx, orgSlug)
    : await getActiveOrganizationId(ctx);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRequestRetries; attempt++) {
    try {
      const res = await portalApiRequest(organizationId, 'get', '/api/applications', {
        failOnStatusCode: false,
      });
      const status = res.status();

      if (status !== 200) {
        const body = await res.text();
        const error = new Error(
          `Get default application failed: ${status} ${body}`,
        );
        if (isRetryableStatus(status)) {
          lastError = error;
          await sleep(2000 * (attempt + 1));
          continue;
        }
        throw error;
      }

      const data = await res.json();
      const defaultApp = data.list?.find(
        (app: { name: string }) => app.name === 'default',
      );

      if (!defaultApp?.id) {
        throw new Error('Default application not found');
      }

      return defaultApp.id;
    } catch (err) {
      if (isTransientNetworkError(err)) {
        lastError = err instanceof Error ? err : new Error(String(err));
        await sleep(2000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error('Get default application failed after retries');
};

export const createApplication = async (
  ctx: Ctx,
  data: { name: string; desc?: string },
  orgSlug?: string,
) => {
  const organizationId = orgSlug
    ? await getOrganizationIdBySlug(ctx, orgSlug)
    : await getActiveOrganizationId(ctx);
  const res = await portalApiRequest(organizationId, 'post', '/api/applications', {
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
  await createApplication(ctx, { name: 'default' }, body.slug);
  return body;
};

/** Invite a member via UI: members page -> Invite member -> fill email -> submit. */
export const inviteMemberViaUI = async (
  ownerPage: Page,
  orgSlug: string,
  memberEmail: string,
  role: 'member' | 'admin' = 'member',
) => {
  await ownerPage.goto(`/${orgSlug}/members`);
  await ownerPage.getByRole('button', { name: 'Invite member' }).click();
  const dialog = ownerPage.getByRole('dialog', { name: 'Invite member' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Email' }).fill(memberEmail);
  // Always pick the role explicitly: the dialog's preselected default can be
  // cleared by a re-render that lands before the form is touched.
  await dialog.getByRole('combobox', { name: 'Role' }).click();
  // Select renders options in a portal outside the dialog
  await ownerPage
    .getByRole('option', { name: role === 'admin' ? 'Admin' : 'Member' })
    .click();
  await expect(dialog.getByRole('combobox', { name: 'Role' })).toContainText(
    role === 'admin' ? 'Admin' : 'Member',
  );
  await dialog.getByRole('button', { name: 'Invite member' }).click();
  await expect(dialog).toBeHidden();
};

/**
 * Accept an organization invitation via UI: member goes to landing page -> clicks Accept on invitation row.
 * Uses aria-haspopup="menu" to target the dropdown trigger (not the "Add" button from Add Organization card).
 */
export const acceptInvitationViaUI = async (
  memberPage: Page,
  memberEmail: string,
) => {
  await memberPage.goto(PATH_LANDING);
  const row = memberPage
    .locator('div')
    .filter({
      hasText: memberEmail,
      has: memberPage.locator('button[aria-haspopup="menu"]'),
    })
    .first();
  await expect(row).toBeVisible();
  await row.locator('button[aria-haspopup="menu"]').click();
  await memberPage.getByRole('menuitem', { name: 'Accept' }).click();
};

/**
 * Get active organization ID from session — the `X-Portal-Developer-ID`
 * portalApiRequest() needs to talk to the Portal API directly.
 */
export const getActiveOrganizationId = async (ctx: Ctx): Promise<string> => {
  const res = await getSession(ctx);
  const body = await res.json();
  const orgId = body?.session?.activeOrganizationId;
  if (orgId) {
    return orgId as string;
  }

  const fullOrgRes = await ctx.get(
    `${AUTH_BASE_PATH}/organization/get-full-organization`,
    {
      failOnStatusCode: false,
    },
  );
  if (fullOrgRes.status() === 200) {
    const fullOrgBody = await fullOrgRes.json();
    if (fullOrgBody?.id) {
      return fullOrgBody.id as string;
    }
  }

  const listRes = await ctx.get(`${AUTH_BASE_PATH}/organization/list`, {
    failOnStatusCode: false,
  });
  expect(listRes.status()).toBe(200);
  const orgList = await listRes.json();
  const fallbackOrgId = orgList?.[0]?.id;
  expect(fallbackOrgId).toBeTruthy();
  return fallbackOrgId as string;
};

export const getActiveOrganizationSlug = async (ctx: Ctx): Promise<string> => {
  // Right after `createOrganization` returns, the session's org linkage can
  // still be settling — a `get-full-organization` call in that window has
  // been observed to 400 transiently and succeed moments later. The call is
  // a read, so retrying is safe.
  let res;
  for (let attempt = 0; attempt < maxRequestRetries; attempt++) {
    res = await ctx.get(
      `${AUTH_BASE_PATH}/organization/get-full-organization`,
      {
        failOnStatusCode: false,
      },
    );
    if (res.status() === 200) break;
    await sleep(500 * (attempt + 1));
  }
  expect(res!.status()).toBe(200);
  const body = await res!.json();
  expect(body?.slug).toBeTruthy();
  return body.slug as string;
};

export const getOrganizationIdBySlug = async (
  ctx: Ctx,
  slug: string,
): Promise<string> => {
  const res = await ctx.get(
    `${AUTH_BASE_PATH}/organization/get-full-organization?organizationSlug=${encodeURIComponent(slug)}`,
    {
      failOnStatusCode: false,
    },
  );
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body?.id).toBeTruthy();
  return body.id as string;
};

/**
 * Setup member user via invitation flow:
 * Owner invites via UI (organization members page) -> member registers -> member accepts via UI (landing page) -> set active org.
 */
export const setupMemberUser = async (
  ownerPage: Page,
  memberAuth: { email: string; password: string; name: string },
  organizationId: string,
  storageStatePath: string,
): Promise<string> => {
  const memberCtx = await genCtx();
  const ownerCtx = await genCtx({
    storageState: await ownerPage.context().storageState(),
  });
  try {
    await login(memberCtx, memberAuth);

    const inviteRes = await ownerCtx.post(
      `${AUTH_BASE_PATH}/organization/invite-member`,
      {
        data: {
          email: memberAuth.email,
          role: 'member',
          organizationId,
        },
        failOnStatusCode: false,
      },
    );
    expect(inviteRes.status()).toBe(200);
    const invitation = await inviteRes.json();

    const acceptRes = await memberCtx.post(
      `${AUTH_BASE_PATH}/organization/accept-invitation`,
      {
        data: { invitationId: invitation.id },
        failOnStatusCode: false,
      },
    );
    expect(acceptRes.status()).toBe(200);

    const setActiveResponse = await memberCtx.post(ORG_SET_ACTIVE, {
      data: { organizationId },
      failOnStatusCode: false,
    });
    expect(setActiveResponse.status()).toBe(200);

    await memberCtx.storageState({ path: storageStatePath });
  } finally {
    await ownerCtx.dispose();
    await memberCtx.dispose();
  }

  return storageStatePath;
};

/**
 * Setup admin user via invitation flow:
 * Owner invites as admin via UI -> admin registers -> admin accepts via UI -> set active org.
 */
export const setupAdminUser = async (
  ownerPage: Page,
  adminAuth: { email: string; password: string; name: string },
  organizationId: string,
  storageStatePath: string,
): Promise<string> => {
  const adminCtx = await genCtx();
  const ownerCtx = await genCtx({
    storageState: await ownerPage.context().storageState(),
  });
  try {
    await login(adminCtx, adminAuth);

    const inviteRes = await ownerCtx.post(
      `${AUTH_BASE_PATH}/organization/invite-member`,
      {
        data: {
          email: adminAuth.email,
          role: 'admin',
          organizationId,
        },
        failOnStatusCode: false,
      },
    );
    expect(inviteRes.status()).toBe(200);
    const invitation = await inviteRes.json();

    const acceptRes = await adminCtx.post(
      `${AUTH_BASE_PATH}/organization/accept-invitation`,
      {
        data: { invitationId: invitation.id },
        failOnStatusCode: false,
      },
    );
    expect(acceptRes.status()).toBe(200);

    const setActiveRes = await adminCtx.post(ORG_SET_ACTIVE, {
      data: { organizationId },
      failOnStatusCode: false,
    });
    expect(setActiveRes.status()).toBe(200);

    await adminCtx.storageState({ path: storageStatePath });
  } finally {
    await ownerCtx.dispose();
    await adminCtx.dispose();
  }

  return storageStatePath;
};

/**
 * Assert API returns 403 for member write operations.
 */
export const expectMemberWriteForbidden = async (
  memberCtx: Ctx,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: unknown,
) => {
  let res;
  switch (method) {
    case 'POST':
      res = await memberCtx.post(url, { data, failOnStatusCode: false });
      break;
    case 'PUT':
      res = await memberCtx.put(url, { data, failOnStatusCode: false });
      break;
    case 'PATCH':
      res = await memberCtx.patch(url, { data, failOnStatusCode: false });
      break;
    case 'DELETE':
      res = await memberCtx.delete(url, { failOnStatusCode: false });
      break;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
  expect(res.status()).toBe(403);
  const body = await res.json().catch(() => ({}));
  const errText = (
    body?.message ||
    body?.code ||
    (typeof body === 'object' ? JSON.stringify(body) : String(body)) ||
    ''
  ).toLowerCase();
  expect(errText.includes('forbidden') || errText.includes('not allowed')).toBe(
    true,
  );
};
