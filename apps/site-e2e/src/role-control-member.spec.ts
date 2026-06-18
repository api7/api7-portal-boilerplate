/**
 * Role control: Member is read-only for applications and organization.
 * - UI: Application-related buttons disabled; Invite Member disabled; Organization settings Save disabled
 * - API: POST/PUT/PATCH/DELETE to applications, credentials, subscriptions return 403
 *
 * Uses invitation flow: owner invites member by email -> member accepts.
 */
import fs from 'node:fs';
import path from 'node:path';

import { expect } from '@playwright/test';
import {
  API_PREFIX,
  AUTH_BASE_PATH,
} from '@site/constants/api-prefix';
import {
  PATH_APPLICATIONS,
} from '@site/constants/path-prefix';

import { E2E_TARGET_URL } from '../constant';
import { test } from '../fixture';
import { genAuth } from '../fixture';
import {
  expectMemberWriteForbidden,
  genCtx,
  getActiveOrganizationId,
  getActiveOrganizationSlug,
  setupAdminUser,
  setupMemberUser,
} from '../req/common';
import { a7DefaultPortalID, a7DeveloperExists } from '../req/dashboard/common';
import { uiAddApplication, uiGetMoreOptionsButton } from '../utils/ui';

test.describe('Role Control - Member Read-Only', () => {
  test('member: Add Application button is disabled', async ({
    ctx,
    page,
    browser,
  }) => {
    const testId = `member-ui-${Date.now()}`;
    const memberAuth = {
      ...genAuth(`member-${testId}`),
      email: `member${testId}@test.example.com`,
      password: `Password3412.${testId}`,
      name: `member-${testId}`,
    };

    const orgId = await getActiveOrganizationId(ctx);
    const outputDir = test.info().project.outputDir;
    const memberStatePath = path.resolve(
      outputDir,
      '.auth',
      `member-${testId}.json`,
    );
    fs.mkdirSync(path.dirname(memberStatePath), { recursive: true });

    await setupMemberUser(page, memberAuth, orgId, memberStatePath);

    const memberContext = await browser.newContext({
      storageState: memberStatePath,
      baseURL: E2E_TARGET_URL,
    });
    const memberPage = await memberContext.newPage();

    await memberPage.goto(PATH_APPLICATIONS);
    await expect(
      memberPage.getByRole('main').getByText('My Applications'),
    ).toBeVisible();
    await expect(memberPage.getByTestId('application-table')).toBeVisible();

    const addBtn = memberPage.getByRole('button', { name: 'Add Application' });
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeDisabled();

    await memberContext.close();
  });

  test('member: Actions menu (Edit/Delete) is disabled', async ({
    ctx,
    page,
    browser,
  }) => {
    const testId = `member-actions-${Date.now()}`;
    const appName = `AppForMember${testId}`;

    await page.goto(PATH_APPLICATIONS);
    await uiAddApplication(page, { name: appName, desc: 'For member test' });
    await expect(page.getByRole('cell', { name: appName })).toBeVisible();

    const orgId = await getActiveOrganizationId(ctx);
    const memberAuth = {
      email: `member${testId}@test.example.com`,
      password: `Password3412.${testId}`,
      name: `member-${testId}`,
    };

    const outputDir = test.info().project.outputDir;
    const memberStatePath = path.resolve(
      outputDir,
      '.auth',
      `member-actions-${testId}.json`,
    );
    fs.mkdirSync(path.dirname(memberStatePath), { recursive: true });

    await setupMemberUser(page, memberAuth, orgId, memberStatePath);

    const memberContext = await browser.newContext({
      storageState: memberStatePath,
      baseURL: E2E_TARGET_URL,
    });
    const memberPage = await memberContext.newPage();

    await memberPage.goto(PATH_APPLICATIONS);
    await expect(memberPage.getByRole('cell', { name: appName })).toBeVisible();

    const row = memberPage
      .getByRole('cell', { name: appName })
      .locator('xpath=ancestor::tr[1]');
    const moreMenuBtn = uiGetMoreOptionsButton(row);
    await expect(moreMenuBtn).toBeVisible();
    await expect(moreMenuBtn).toBeDisabled();

    await memberContext.close();
  });

  test('member: Subscribe to New API Product button is disabled', async ({
    ctx,
    page,
    browser,
  }) => {
    const testId = `member-sub-${Date.now()}`;
    const appName = `AppSubMember${testId}`;

    await page.goto(PATH_APPLICATIONS);
    await uiAddApplication(page, { name: appName, desc: 'For subscribe test' });

    const orgId = await getActiveOrganizationId(ctx);
    const memberAuth = {
      email: `member${testId}@test.example.com`,
      password: `Password3412.${testId}`,
      name: `member-${testId}`,
    };

    const outputDir = test.info().project.outputDir;
    const memberStatePath = path.resolve(
      outputDir,
      '.auth',
      `member-sub-${testId}.json`,
    );
    fs.mkdirSync(path.dirname(memberStatePath), { recursive: true });

    await setupMemberUser(page, memberAuth, orgId, memberStatePath);

    const memberContext = await browser.newContext({
      storageState: memberStatePath,
      baseURL: E2E_TARGET_URL,
    });
    const memberPage = await memberContext.newPage();

    await memberPage.goto(PATH_APPLICATIONS);
    const nameLink = memberPage.getByText(appName);
    await nameLink.click();
    await expect(memberPage).toHaveURL(/\/applications\/[^/]+$/);

    await memberPage.getByRole('tab', { name: 'Subscriptions' }).click();
    const subscribeBtn = memberPage.getByRole('button', {
      name: 'Subscribe to New API Product',
    });
    await expect(subscribeBtn).toBeVisible();
    await expect(subscribeBtn).toBeDisabled();

    await memberContext.close();
  });

  test('member: Invite Member button is disabled', async ({
    ctx,
    page,
    browser,
  }) => {
    const testId = `member-invite-${Date.now()}`;
    const memberAuth = {
      email: `member${testId}@test.example.com`,
      password: `Password3412.${testId}`,
      name: `member-${testId}`,
    };

    const orgId = await getActiveOrganizationId(ctx);
    const orgSlug = await getActiveOrganizationSlug(ctx);
    const outputDir = test.info().project.outputDir;
    const memberStatePath = path.resolve(
      outputDir,
      '.auth',
      `member-invite-${testId}.json`,
    );
    fs.mkdirSync(path.dirname(memberStatePath), { recursive: true });

    await setupMemberUser(page, memberAuth, orgId, memberStatePath);

    const memberContext = await browser.newContext({
      storageState: memberStatePath,
      baseURL: E2E_TARGET_URL,
    });
    const memberPage = await memberContext.newPage();

    await memberPage.goto(`/${orgSlug}/members`);
    const inviteBtn = memberPage.getByRole('button', {
      name: 'Invite Member',
    });
    await expect(inviteBtn).toBeVisible();
    await expect(inviteBtn).toBeDisabled();

    await memberContext.close();
  });

  test('member: Organization settings Save button is disabled', async ({
    ctx,
    page,
    browser,
  }) => {
    const testId = `member-settings-${Date.now()}`;
    const memberAuth = {
      email: `member${testId}@test.example.com`,
      password: `Password3412.${testId}`,
      name: `member-${testId}`,
    };

    const orgId = await getActiveOrganizationId(ctx);
    const orgSlug = await getActiveOrganizationSlug(ctx);
    const outputDir = test.info().project.outputDir;
    const memberStatePath = path.resolve(
      outputDir,
      '.auth',
      `member-settings-${testId}.json`,
    );
    fs.mkdirSync(path.dirname(memberStatePath), { recursive: true });

    await setupMemberUser(page, memberAuth, orgId, memberStatePath);

    const memberContext = await browser.newContext({
      storageState: memberStatePath,
      baseURL: E2E_TARGET_URL,
    });
    const memberPage = await memberContext.newPage();

    await memberPage.goto(`/${orgSlug}/settings`);
    const saveBtn = memberPage.getByRole('button', { name: 'Save' }).first();
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeDisabled();

    await memberContext.close();
  });

  test('member: Add credential buttons are disabled', async ({
    ctx,
    page,
    browser,
  }) => {
    const testId = `member-cred-${Date.now()}`;
    const appName = `AppCredMember${testId}`;

    await page.goto(PATH_APPLICATIONS);
    await uiAddApplication(page, {
      name: appName,
      desc: 'For credential test',
    });

    const orgId = await getActiveOrganizationId(ctx);
    const memberAuth = {
      email: `member${testId}@test.example.com`,
      password: `Password3412.${testId}`,
      name: `member-${testId}`,
    };

    const outputDir = test.info().project.outputDir;
    const memberStatePath = path.resolve(
      outputDir,
      '.auth',
      `member-cred-${testId}.json`,
    );
    fs.mkdirSync(path.dirname(memberStatePath), { recursive: true });

    await setupMemberUser(page, memberAuth, orgId, memberStatePath);

    const memberContext = await browser.newContext({
      storageState: memberStatePath,
      baseURL: E2E_TARGET_URL,
    });
    const memberPage = await memberContext.newPage();

    await memberPage.goto(PATH_APPLICATIONS);
    await memberPage.getByText(appName).click();
    await memberPage.getByRole('tab', { name: 'Authentication Type' }).click();

    const addKeyAuthBtn = memberPage.getByRole('button', {
      name: 'Add Key Authentication Credential',
    });
    await expect(addKeyAuthBtn).toBeVisible();
    await expect(addKeyAuthBtn).toBeDisabled();

    await memberContext.close();
  });

  test('member: API POST applications returns 403', async ({
    ctx,
    page,
    browser,
  }) => {
    const testId = `member-api-app-${Date.now()}`;
    const memberAuth = {
      email: `member${testId}@test.example.com`,
      password: `Password3412.${testId}`,
      name: `member-${testId}`,
    };

    const orgId = await getActiveOrganizationId(ctx);
    const ownerSlug = await getActiveOrganizationSlug(ctx);
    const outputDir = test.info().project.outputDir;
    const memberStatePath = path.resolve(
      outputDir,
      '.auth',
      `member-api-${testId}.json`,
    );
    fs.mkdirSync(path.dirname(memberStatePath), { recursive: true });

    await setupMemberUser(page, memberAuth, orgId, memberStatePath);

    const memberCtx = await genCtx({
      storageState: memberStatePath,
      extraHTTPHeaders: {
        origin: process.env.E2E_TARGET_URL || 'http://localhost:3001',
      },
    });

    await expectMemberWriteForbidden(
      memberCtx,
      'POST',
      `${API_PREFIX}/${ownerSlug}/applications`,
      {
        name: 'ForbiddenApp',
        desc: 'Should fail',
      },
    );

    await memberCtx.dispose();
  });

  test('member: API DELETE applications returns 403', async ({
    ctx,
    page,
    browser,
  }) => {
    const testId = `member-api-del-${Date.now()}`;
    const appName = `AppToDelete${testId}`;

    await page.goto(PATH_APPLICATIONS);
    await uiAddApplication(page, { name: appName, desc: 'For delete test' });
    const ownerSlug = await getActiveOrganizationSlug(ctx);
    const appsRes = await ctx.get(`${API_PREFIX}/${ownerSlug}/applications`);
    const appsData = await appsRes.json();
    const app = appsData.list?.find(
      (a: { name: string }) => a.name === appName,
    );
    expect(app?.id).toBeTruthy();

    const orgId = await getActiveOrganizationId(ctx);
    const memberAuth = {
      email: `member${testId}@test.example.com`,
      password: `Password3412.${testId}`,
      name: `member-${testId}`,
    };

    const outputDir = test.info().project.outputDir;
    const memberStatePath = path.resolve(
      outputDir,
      '.auth',
      `member-api-del-${testId}.json`,
    );
    fs.mkdirSync(path.dirname(memberStatePath), { recursive: true });

    await setupMemberUser(page, memberAuth, orgId, memberStatePath);

    const memberCtx = await genCtx({
      storageState: memberStatePath,
      extraHTTPHeaders: {
        origin: process.env.E2E_TARGET_URL || 'http://localhost:3001',
      },
    });

    await expectMemberWriteForbidden(
      memberCtx,
      'DELETE',
      `${API_PREFIX}/${ownerSlug}/applications/${app.id}`,
    );

    await memberCtx.dispose();
  });

  test('member: API POST credentials returns 403', async ({
    ctx,
    page,
    browser,
  }) => {
    const testId = `member-api-cred-${Date.now()}`;

    const ownerSlug = await getActiveOrganizationSlug(ctx);
    const appsRes = await ctx.get(`${API_PREFIX}/${ownerSlug}/applications`);
    const appsData = await appsRes.json();
    const appId = appsData.list?.[0]?.id;
    expect(appId).toBeTruthy();

    const orgId = await getActiveOrganizationId(ctx);
    const memberAuth = {
      email: `member${testId}@test.example.com`,
      password: `Password3412.${testId}`,
      name: `member-${testId}`,
    };

    const outputDir = test.info().project.outputDir;
    const memberStatePath = path.resolve(
      outputDir,
      '.auth',
      `member-api-cred-${testId}.json`,
    );
    fs.mkdirSync(path.dirname(memberStatePath), { recursive: true });

    await setupMemberUser(page, memberAuth, orgId, memberStatePath);

    const memberCtx = await genCtx({
      storageState: memberStatePath,
      extraHTTPHeaders: {
        origin: process.env.E2E_TARGET_URL || 'http://localhost:3001',
      },
    });

    await expectMemberWriteForbidden(
      memberCtx,
      'POST',
      `${API_PREFIX}/${ownerSlug}/credentials`,
      {
        name: 'ForbiddenCred',
        auth_method: 'key-auth',
        application_id: appId,
      },
    );

    await memberCtx.dispose();
  });

  test('member: API POST subscriptions returns 403', async ({
    ctx,
    page,
    browser,
  }) => {
    const testId = `member-api-sub-${Date.now()}`;

    const ownerSlug = await getActiveOrganizationSlug(ctx);

    // 403 comes from the proxy role check, before the portal API validates the
    // request body — so fake IDs are sufficient here.
    const orgId = await getActiveOrganizationId(ctx);
    const memberAuth = {
      email: `member${testId}@test.example.com`,
      password: `Password3412.${testId}`,
      name: `member-${testId}`,
    };

    const outputDir = test.info().project.outputDir;
    const memberStatePath = path.resolve(
      outputDir,
      '.auth',
      `member-api-sub-${testId}.json`,
    );
    fs.mkdirSync(path.dirname(memberStatePath), { recursive: true });

    await setupMemberUser(page, memberAuth, orgId, memberStatePath);

    const memberCtx = await genCtx({
      storageState: memberStatePath,
      extraHTTPHeaders: {
        origin: process.env.E2E_TARGET_URL || 'http://localhost:3001',
      },
    });

    await expectMemberWriteForbidden(
      memberCtx,
      'POST',
      `${API_PREFIX}/${ownerSlug}/subscriptions`,
      {
        api_products: ['fake-product-id'],
        applications: ['fake-app-id'],
      },
    );

    await memberCtx.dispose();
  });

  test('member: API GET applications succeeds (read allowed)', async ({
    ctx,
    page,
    browser,
  }) => {
    const testId = `member-api-get-${Date.now()}`;
    const memberAuth = {
      email: `member${testId}@test.example.com`,
      password: `Password3412.${testId}`,
      name: `member-${testId}`,
    };

    const orgId = await getActiveOrganizationId(ctx);
    const outputDir = test.info().project.outputDir;
    const memberStatePath = path.resolve(
      outputDir,
      '.auth',
      `member-api-get-${testId}.json`,
    );
    fs.mkdirSync(path.dirname(memberStatePath), { recursive: true });

    await setupMemberUser(page, memberAuth, orgId, memberStatePath);

    const memberCtx = await genCtx({
      storageState: memberStatePath,
      extraHTTPHeaders: {
        origin: process.env.E2E_TARGET_URL || 'http://localhost:3001',
      },
    });

    const ownerSlug = await getActiveOrganizationSlug(ctx);
    const res = await memberCtx.get(`${API_PREFIX}/${ownerSlug}/applications`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(200);

    await memberCtx.dispose();
  });
});

test.describe('Role Control - Admin', () => {
  test('admin: Delete Organization button is not visible on settings page', async ({
    ctx,
    page,
    browser,
  }) => {
    const testId = `admin-del-ui-${Date.now()}`;
    const adminAuth = {
      email: `admin${testId}@test.example.com`,
      password: `Password3412.${testId}`,
      name: `admin-${testId}`,
    };

    const orgId = await getActiveOrganizationId(ctx);
    const outputDir = test.info().project.outputDir;
    const adminStatePath = path.resolve(
      outputDir,
      '.auth',
      `admin-del-ui-${testId}.json`,
    );
    fs.mkdirSync(path.dirname(adminStatePath), { recursive: true });

    await setupAdminUser(page, adminAuth, orgId, adminStatePath);

    const adminContext = await browser.newContext({
      storageState: adminStatePath,
      baseURL: E2E_TARGET_URL,
    });
    const adminPage = await adminContext.newPage();

    await adminPage.goto(`/organization/settings`);
    await expect(
      adminPage.getByRole('button', { name: 'Delete Organization' }),
    ).toHaveCount(0);

    await adminContext.close();
  });

  test('admin: API POST organization delete returns 403 without deleting developer', async ({
    a7Ctx,
    ctx,
    page,
    browser,
  }) => {
    const testId = `admin-del-org-${Date.now()}`;
    const adminAuth = {
      email: `admin${testId}@test.example.com`,
      password: `Password3412.${testId}`,
      name: `admin-${testId}`,
    };

    const orgId = await getActiveOrganizationId(ctx);
    const outputDir = test.info().project.outputDir;
    const adminStatePath = path.resolve(
      outputDir,
      '.auth',
      `admin-del-org-${testId}.json`,
    );
    fs.mkdirSync(path.dirname(adminStatePath), { recursive: true });

    await setupAdminUser(page, adminAuth, orgId, adminStatePath);

    const portalId = await a7DefaultPortalID(a7Ctx);
    await expect(a7DeveloperExists(a7Ctx, portalId, orgId)).resolves.toBe(true);

    const adminCtx = await genCtx({
      storageState: adminStatePath,
      extraHTTPHeaders: {
        origin: process.env.E2E_TARGET_URL || 'http://localhost:3001',
      },
    });

    await expectMemberWriteForbidden(
      adminCtx,
      'POST',
      `${AUTH_BASE_PATH}/organization/delete`,
      { organizationId: orgId },
    );
    await expect(a7DeveloperExists(a7Ctx, portalId, orgId)).resolves.toBe(true);

    await adminCtx.dispose();
  });
});
