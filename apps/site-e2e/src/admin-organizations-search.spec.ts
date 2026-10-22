import { type Browser, expect, test } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';
import {
  PATH_DASHBOARD_ORGANIZATIONS,
  PATH_LOGIN,
} from '@site/constants/path-prefix';
import type { ConfigMapData } from '@site/lib/config/schema';

import { E2E_TARGET_URL } from '../constant';
import { type Ctx, genCtx, getSession, login } from '../req/common';
import {
  getConfigMapYaml,
  patchConfigMapYaml,
  updateConfigMapYaml,
} from '../utils/devportal-config';
import { restartDevPortal } from '../utils/shell';

const BANNED_USER_MESSAGE =
  'Your account has been suspended. Please contact your portal administrator.';

const createAccount = (prefix: string) => {
  const id = `${prefix}-${Date.now()}`;
  return {
    email: `${id}@test.example.com`,
    password: `Password3412.${id}`,
    name: id,
  };
};

const createOrganizationFor = async (ctx: Ctx, name: string, slug: string) => {
  const res = await ctx.post(`${AUTH_BASE_PATH}/organization/create`, {
    data: { name, slug, keepCurrentActiveOrganization: true },
    failOnStatusCode: false,
  });
  expect(res.status()).toBe(200);
};

const openAdminPage = async (browser: Browser, adminCtx: Ctx) => {
  const context = await browser.newContext({
    baseURL: E2E_TARGET_URL,
    storageState: await adminCtx.storageState(),
  });
  return context.newPage();
};

test.describe.serial('Admin organizations list and banned users', () => {
  test.setTimeout(600_000);

  const admin = createAccount('orgs-search-admin');
  const owner = createAccount('orgs-search-owner');
  // Shared by every organization below so a search can isolate them from the rest.
  const token = `srch${Date.now()}`;
  const organizations = [
    { name: `Alpha ${token}`, slug: `${token}-alpha` },
    { name: `Beta ${token}`, slug: `${token}-beta` },
    { name: `Gamma ${token}`, slug: `${token}-gamma` },
  ];

  let defaultConfig: string | null = null;
  let adminCtx: Ctx;

  test.beforeAll(async () => {
    defaultConfig = await getConfigMapYaml();

    const ownerCtx = await genCtx();
    await login(ownerCtx, owner);
    for (const org of organizations) {
      await createOrganizationFor(ownerCtx, org.name, org.slug);
    }
    await ownerCtx.dispose();

    const signUpCtx = await genCtx();
    await login(signUpCtx, admin);
    const adminUserId = (await (await getSession(signUpCtx)).json()).user.id;
    await signUpCtx.dispose();

    await patchConfigMapYaml<ConfigMapData>((config) => {
      config.auth.adminUserIds = [
        ...new Set([...(config.auth.adminUserIds ?? []), adminUserId]),
      ];
    });
    await restartDevPortal();

    adminCtx = await genCtx();
    await login(adminCtx, admin);
  });

  test.afterAll(async () => {
    await adminCtx?.dispose();
    if (defaultConfig) {
      await updateConfigMapYaml(defaultConfig);
      await restartDevPortal();
    }
  });

  test('admin can search organizations by name or slug', async ({
    browser,
  }) => {
    const page = await openAdminPage(browser, adminCtx);
    await page.goto(PATH_DASHBOARD_ORGANIZATIONS);
    await page.waitForLoadState('networkidle');

    const search = page.getByPlaceholder('Search by name or slug');
    await search.fill(`Beta ${token}`);
    await search.press('Enter');
    await expect(page).toHaveURL(/[?&]search=/);
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(organizations[1].slug);

    await page.goto(
      `${PATH_DASHBOARD_ORGANIZATIONS}?search=${organizations[2].slug}`,
    );
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(organizations[2].name);

    await page.context().close();
  });

  test('SQL wildcards in the search are matched literally', async ({
    browser,
  }) => {
    const page = await openAdminPage(browser, adminCtx);
    await page.goto(
      `${PATH_DASHBOARD_ORGANIZATIONS}?search=${encodeURIComponent(`${token}%gamma`)}`,
    );
    await expect(page.getByText('No organizations found.')).toBeVisible();

    await page.goto(
      `${PATH_DASHBOARD_ORGANIZATIONS}?search=${encodeURIComponent(`${token}_alpha`)}`,
    );
    await expect(page.getByText('No organizations found.')).toBeVisible();

    await page.context().close();
  });

  test('admin can page through search results', async ({ browser }) => {
    const page = await openAdminPage(browser, adminCtx);
    await page.goto(
      `${PATH_DASHBOARD_ORGANIZATIONS}?search=${token}&page_size=2`,
    );
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(page.getByTestId('result-text')).toContainText('of 3');

    await page.getByLabel('Next page').click();
    await expect(page).toHaveURL(/[?&]page=2/);
    await expect(rows).toHaveCount(1);

    await page.context().close();
  });

  test('a banned user is told their account is suspended when signing in', async ({
    browser,
  }) => {
    const banned = createAccount('banned-user');
    const bannedCtx = await genCtx();
    await login(bannedCtx, banned);
    const bannedUserId = (await (await getSession(bannedCtx)).json()).user.id;
    await bannedCtx.dispose();

    const banRes = await adminCtx.post(`${AUTH_BASE_PATH}/admin/ban-user`, {
      data: { userId: bannedUserId, banReason: 'e2e' },
      failOnStatusCode: false,
    });
    expect(banRes.status()).toBe(200);

    const context = await browser.newContext({
      baseURL: E2E_TARGET_URL,
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto(PATH_LOGIN);
    await page.waitForLoadState('networkidle');
    await page.getByRole('textbox', { name: 'Email' }).fill(banned.email);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(banned.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await expect(page.getByText(BANNED_USER_MESSAGE)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(PATH_LOGIN));

    await context.close();
  });
});
