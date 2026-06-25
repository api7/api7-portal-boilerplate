import fs from 'node:fs';
import path from 'node:path';

import { Browser, expect, test } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';
import { PATH_DASHBOARD_ORGANIZATIONS } from '@site/constants/path-prefix';
import { ConfigMapData } from '@site/lib/config/schema';

import { E2E_TARGET_URL } from '../constant';
import { createOrganization, genCtx, getSession, login } from '../req/common';
import {
  a7ActivateLicenseAndChangePasswd,
  a7DefaultPortalID,
  a7DeveloperExists,
  a7GenCtx,
} from '../req/dashboard/common';
import {
  getConfigMapYaml,
  patchConfigMapYaml,
  updateConfigMapYaml,
} from '../utils/devportal-config';
import { restartDevPortal } from '../utils/shell';

const createAuth = (prefix: string) => {
  const id = `${prefix}-${Date.now()}`;
  return {
    email: `${id}@test.example.com`,
    password: `Password3412.${id}`,
    name: id,
    organization: `${id}-org`,
  };
};

const createPageWithStorageState = async (
  browser: Browser,
  storageStatePath: string,
  testInfo: { outputDir: string },
) => {
  const context = await browser.newContext({
    baseURL: E2E_TARGET_URL,
    storageState: storageStatePath,
    recordVideo: { dir: testInfo.outputDir },
  });
  const page = await context.newPage();
  return { context, page };
};

test.describe.serial('Admin Organizations — takeover & delete', () => {
  test.setTimeout(60_000);

  const adminAuth = createAuth('orgs-admin');
  const ownerAuth = createAuth('orgs-owner');

  const adminStoragePath = path.resolve(
    process.cwd(),
    `apps/site-e2e/test-results/.auth/${adminAuth.name}.json`,
  );
  const ownerStoragePath = path.resolve(
    process.cwd(),
    `apps/site-e2e/test-results/.auth/${ownerAuth.name}.json`,
  );

  let defaultConfig: string | null = null;
  let organizationId = '';
  let adminUserId = '';

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(600_000);
    fs.mkdirSync(path.dirname(adminStoragePath), { recursive: true });

    defaultConfig = await getConfigMapYaml();

    // Create org owner + organization (also registers a portal developer)
    const ownerCtx = await genCtx();
    await login(ownerCtx, ownerAuth);
    const org = await createOrganization(ownerCtx, ownerAuth.organization);
    organizationId = org.id;
    await ownerCtx.storageState({ path: ownerStoragePath });
    await ownerCtx.dispose();

    // Create platform admin: sign up → grab userId → patch config → restart → re-login
    const adminCtx = await genCtx();
    await login(adminCtx, adminAuth);
    const adminSession = await (await getSession(adminCtx)).json();
    adminUserId = adminSession.user.id;

    await patchConfigMapYaml<ConfigMapData>((cfg) => {
      cfg.auth.adminUserIds = Array.from(
        new Set([...(cfg.auth.adminUserIds ?? []), adminUserId]),
      );
    });
    await restartDevPortal();

    const adminCtxAfter = await genCtx();
    await login(adminCtxAfter, adminAuth);
    await adminCtxAfter.storageState({ path: adminStoragePath });
    await adminCtxAfter.dispose();
    await adminCtx.dispose();
  });

  test.afterAll(async () => {
    if (defaultConfig) {
      await updateConfigMapYaml(defaultConfig);
      await restartDevPortal();
    }
  });

  // ─── Sanity check ────────────────────────────────────────────────────────────

  test('admin sees the target organization in the list', async ({ browser }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStoragePath,
      testInfo,
    );
    try {
      await page.goto(PATH_DASHBOARD_ORGANIZATIONS);
      await expect(page.getByRole('table')).toBeVisible();
      await expect(
        page.getByRole('table').getByRole('row').filter({ hasText: ownerAuth.organization }).first(),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });

  // ─── Takeover ────────────────────────────────────────────────────────────────

  test('admin can take over an organization', async ({ browser }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStoragePath,
      testInfo,
    );
    try {
      await page.goto(
        `${PATH_DASHBOARD_ORGANIZATIONS}?search=${encodeURIComponent(ownerAuth.organization)}`,
      );

      const orgRow = page
        .getByRole('table')
        .getByRole('row')
        .filter({ hasText: ownerAuth.organization })
        .first();
      await expect(orgRow).toBeVisible();

      await orgRow.getByRole('button', { name: 'Open actions' }).click();
      await page.getByRole('menuitem', { name: 'Takeover' }).click();

      const alertDialog = page.getByRole('alertdialog');
      await expect(alertDialog).toBeVisible();
      await alertDialog.getByRole('button', { name: 'Confirm' }).click();

      await expect(page.getByText(/added as owner/i)).toBeVisible();

      // Verify via API: admin is now listed as a member of the org
      const adminCtx = await genCtx({
        storageState: await page.context().storageState(),
      });
      try {
        const res = await adminCtx.get(
          `${AUTH_BASE_PATH}/organization/list-members`,
          {
            params: { organizationId },
            failOnStatusCode: false,
          },
        );
        expect(res.status()).toBe(200);
        const body = await res.json();
        const adminMember = (body.members ?? []).find(
          (m: { userId: string; role: string }) =>
            m.userId === adminUserId && m.role === 'owner',
        );
        expect(adminMember).toBeTruthy();
      } finally {
        await adminCtx.dispose();
      }
    } finally {
      await context.close();
    }
  });

  // ─── Delete + cleanup verification ──────────────────────────────────────────

  test('admin can delete an organization with full cleanup', async ({ browser }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStoragePath,
      testInfo,
    );

    const a7Ctx = await a7GenCtx({
      httpCredentials: {
        username: process.env.A7_ROOT_USERNAME!,
        password: process.env.A7_ROOT_PASSWORD!,
        send: 'always',
      },
    });
    await a7ActivateLicenseAndChangePasswd(a7Ctx);
    const portalId = await a7DefaultPortalID(a7Ctx);

    try {
      // Pre-condition: portal developer must exist before deletion
      expect(await a7DeveloperExists(a7Ctx, portalId, organizationId)).toBe(true);

      await page.goto(
        `${PATH_DASHBOARD_ORGANIZATIONS}?search=${encodeURIComponent(ownerAuth.organization)}`,
      );

      const orgRow = page
        .getByRole('table')
        .getByRole('row')
        .filter({ hasText: ownerAuth.organization })
        .first();
      await expect(orgRow).toBeVisible();

      await orgRow.getByRole('button', { name: 'Open actions' }).click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();

      const alertDialog = page.getByRole('alertdialog');
      await expect(alertDialog).toBeVisible();
      await alertDialog.getByRole('button', { name: 'Delete' }).click();

      await expect(page.getByText(/has been deleted/i)).toBeVisible();

      // Table should update automatically via router.refresh(); also verify after manual reload
      await expect(
        page.getByRole('table').getByRole('row').filter({ hasText: ownerAuth.organization }),
      ).toHaveCount(0);

      await page.reload();
      await expect(
        page.getByRole('table').getByRole('row').filter({ hasText: ownerAuth.organization }),
      ).toHaveCount(0);

      // Verify portal developer was cleaned up (deleteOrganizationAsAdmin calls portal.developer.delete directly)
      expect(await a7DeveloperExists(a7Ctx, portalId, organizationId)).toBe(false);

      // Verify orphan session cleared: owner's activeOrganizationId must be null
      const ownerCtx = await genCtx({ storageState: ownerStoragePath });
      try {
        const sessionRes = await getSession(ownerCtx);
        expect(sessionRes.status()).toBe(200);
        const sessionBody = await sessionRes.json();
        // Must confirm the session is valid (user authenticated) before checking activeOrganizationId,
        // otherwise a null session would produce a false-positive assertion.
        expect(sessionBody?.user?.id).toBeTruthy();
        expect(sessionBody?.session?.activeOrganizationId).toBeNull();
      } finally {
        await ownerCtx.dispose();
      }
    } finally {
      await a7Ctx.dispose();
      await context.close();
    }
  });
});
