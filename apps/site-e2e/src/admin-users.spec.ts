import fs from 'node:fs';
import path from 'node:path';

import { Browser, expect, test } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';
import {
  PATH_DASHBOARD_ORGANIZATIONS,
  PATH_DASHBOARD_USERS,
} from '@site/constants/path-prefix';
import { ConfigMapData } from '@site/lib/config/schema';

import { E2E_TARGET_URL } from '../constant';
import { genCtx, getSession, login } from '../req/common';
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

test.describe.serial('Admin Users Page', () => {
  test.setTimeout(120_000);

  const adminAuth = createAuth('users-admin');
  const targetAuth = createAuth('users-target');
  const nonAdminAuth = createAuth('users-nonadmin');

  const adminStoragePath = path.resolve(
    process.cwd(),
    `apps/site-e2e/test-results/.auth/${adminAuth.name}.json`,
  );
  const targetStoragePath = path.resolve(
    process.cwd(),
    `apps/site-e2e/test-results/.auth/${targetAuth.name}.json`,
  );
  const nonAdminStoragePath = path.resolve(
    process.cwd(),
    `apps/site-e2e/test-results/.auth/${nonAdminAuth.name}.json`,
  );

  let defaultConfig: string | null = null;
  let targetUserId = '';

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(600_000);
    fs.mkdirSync(path.dirname(adminStoragePath), { recursive: true });

    defaultConfig = await getConfigMapYaml();

    // Admin: sign up → patch adminUserIds → restart → re-login → save state
    const adminCtx = await genCtx();
    await login(adminCtx, adminAuth);
    const adminSession = await (await getSession(adminCtx)).json();
    await patchConfigMapYaml<ConfigMapData>((cfg) => {
      cfg.auth.adminUserIds = Array.from(
        new Set([...(cfg.auth.adminUserIds || []), adminSession.user.id]),
      );
    });
    await restartDevPortal();
    const adminCtxAfter = await genCtx();
    await login(adminCtxAfter, adminAuth);
    await adminCtxAfter.storageState({ path: adminStoragePath });
    await adminCtxAfter.dispose();
    await adminCtx.dispose();

    // Target user: sign up and save their id + storage state
    const targetCtx = await genCtx();
    await login(targetCtx, targetAuth);
    const targetSession = await (await getSession(targetCtx)).json();
    targetUserId = targetSession.user.id;
    await targetCtx.storageState({ path: targetStoragePath });
    await targetCtx.dispose();

    // Non-admin: sign up and save storage state
    const nonAdminCtx = await genCtx();
    await login(nonAdminCtx, nonAdminAuth);
    await nonAdminCtx.storageState({ path: nonAdminStoragePath });
    await nonAdminCtx.dispose();
  });

  test.afterAll(async () => {
    if (defaultConfig) {
      await updateConfigMapYaml(defaultConfig);
      await restartDevPortal();
    }
  });

  test('non-admin cannot access /admin/users', async ({ browser }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      nonAdminStoragePath,
      testInfo,
    );
    try {
      await page.goto(PATH_DASHBOARD_USERS);
      await expect(page).not.toHaveURL(/\/admin\/users(?:\?.*)?$/);
    } finally {
      await context.close();
    }
  });

  test('admin sees the user list and target user appears', async (
    { browser },
    testInfo,
  ) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStoragePath,
      testInfo,
    );
    try {
      await page.goto(PATH_DASHBOARD_USERS);
      await expect(page).toHaveURL(/\/admin\/users(?:\?.*)?$/);
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('table').getByText(targetAuth.email)).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('admin can search users by email', async ({ browser }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStoragePath,
      testInfo,
    );
    try {
      await page.goto(PATH_DASHBOARD_USERS);
      await page.getByPlaceholder('Search by email').fill(targetAuth.email);
      await page.getByPlaceholder('Search by email').press('Enter');
      await expect(page.getByRole('table').getByText(targetAuth.email)).toBeVisible();
      // Non-matching admin user email should not appear in the filtered results
      await expect(
        page.getByRole('table').getByText(adminAuth.email),
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('admin can change a user role to admin', async ({ browser }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStoragePath,
      testInfo,
    );
    try {
      await page.goto(
        `${PATH_DASHBOARD_USERS}?search=${encodeURIComponent(targetAuth.email)}`,
      );
      const targetRow = page
        .getByRole('table')
        .getByRole('row')
        .filter({ hasText: targetAuth.email })
        .first();
      await expect(targetRow).toBeVisible();

      await targetRow.getByRole('button', { name: 'Open actions' }).click();
      await page.getByRole('menuitem', { name: 'Change Role' }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      // Switch the select to 'admin'
      await dialog.getByRole('combobox').click();
      await page.getByRole('option', { name: 'admin' }).click();
      await dialog.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByText('Role updated')).toBeVisible();
      await page.reload();
      const updatedRow = page
        .getByRole('table')
        .getByRole('row')
        .filter({ hasText: targetAuth.email })
        .first();
      await expect(updatedRow.getByText('admin')).toBeVisible();
    } finally {
      // Reset role back to 'user' so subsequent tests start from a known state
      await page.request.post(`${AUTH_BASE_PATH}/admin/set-role`, {
        data: { userId: targetUserId, role: 'user' },
        failOnStatusCode: false,
      });
      await context.close();
    }
  });

  test('admin can ban a user with a reason', async ({ browser }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStoragePath,
      testInfo,
    );
    try {
      await page.goto(
        `${PATH_DASHBOARD_USERS}?search=${encodeURIComponent(targetAuth.email)}`,
      );
      const targetRow = page
        .getByRole('table')
        .getByRole('row')
        .filter({ hasText: targetAuth.email })
        .first();
      await expect(targetRow.getByText('Active')).toBeVisible();

      await targetRow.getByRole('button', { name: 'Open actions' }).click();
      await page.getByRole('menuitem', { name: 'Ban' }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.getByPlaceholder('Enter ban reason').fill('Violation of terms');
      await dialog.getByRole('button', { name: 'Ban User' }).click();

      await expect(page.getByText('User banned')).toBeVisible();
      await page.reload();
      const updatedRow = page
        .getByRole('table')
        .getByRole('row')
        .filter({ hasText: targetAuth.email })
        .first();
      await expect(updatedRow.getByText('Banned')).toBeVisible();
    } finally {
      // Ensure the user is unbanned so subsequent tests start clean
      await page.request.post(`${AUTH_BASE_PATH}/admin/unban-user`, {
        data: { userId: targetUserId },
        failOnStatusCode: false,
      });
      await context.close();
    }
  });

  test('admin can unban a banned user', async ({ browser }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStoragePath,
      testInfo,
    );
    try {
      // Pre-condition: ban the user via API
      await page.request.post(`${AUTH_BASE_PATH}/admin/ban-user`, {
        data: { userId: targetUserId, banReason: 'Temporary test ban' },
        failOnStatusCode: false,
      });

      await page.goto(
        `${PATH_DASHBOARD_USERS}?search=${encodeURIComponent(targetAuth.email)}`,
      );
      const targetRow = page
        .getByRole('table')
        .getByRole('row')
        .filter({ hasText: targetAuth.email })
        .first();
      await expect(targetRow.getByText('Banned')).toBeVisible();

      await targetRow.getByRole('button', { name: 'Open actions' }).click();
      await page.getByRole('menuitem', { name: 'Unban' }).click();

      const alertDialog = page.getByRole('alertdialog');
      await expect(alertDialog).toBeVisible();
      await alertDialog.getByRole('button', { name: 'Unban' }).click();

      await expect(page.getByText('User unbanned')).toBeVisible();
      await page.reload();
      const updatedRow = page
        .getByRole('table')
        .getByRole('row')
        .filter({ hasText: targetAuth.email })
        .first();
      await expect(updatedRow.getByText('Active')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('Organizations View link navigates to organizations filtered by user', async (
    { browser },
    testInfo,
  ) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStoragePath,
      testInfo,
    );
    try {
      await page.goto(
        `${PATH_DASHBOARD_USERS}?search=${encodeURIComponent(targetAuth.email)}`,
      );
      const targetRow = page
        .getByRole('table')
        .getByRole('row')
        .filter({ hasText: targetAuth.email })
        .first();
      await expect(targetRow).toBeVisible();

      await targetRow.getByRole('link', { name: 'View' }).click();
      await expect(page).toHaveURL(
        new RegExp(
          `${PATH_DASHBOARD_ORGANIZATIONS}.*user_id=${targetUserId}`,
        ),
      );
    } finally {
      await context.close();
    }
  });

  // Must run last: deleting the target user removes them from the DB permanently.
  test('admin can delete a user', async ({ browser }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStoragePath,
      testInfo,
    );
    try {
      await page.goto(
        `${PATH_DASHBOARD_USERS}?search=${encodeURIComponent(targetAuth.email)}`,
      );
      const targetRow = page
        .getByRole('table')
        .getByRole('row')
        .filter({ hasText: targetAuth.email })
        .first();
      await expect(targetRow).toBeVisible();

      await targetRow.getByRole('button', { name: 'Open actions' }).click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();

      const alertDialog = page.getByRole('alertdialog');
      await expect(alertDialog).toBeVisible();
      await expect(
        alertDialog.getByText('This action cannot be undone'),
      ).toBeVisible();
      await alertDialog.getByRole('button', { name: 'Delete' }).click();

      await expect(page.getByText('User deleted')).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole('table').getByText(targetAuth.email),
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
