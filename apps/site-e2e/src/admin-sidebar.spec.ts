import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { PATH_DASHBOARD_ORGANIZATIONS } from '@site/constants/path-prefix';
import type { ConfigMapData } from '@site/lib/config/schema';

import { E2E_TARGET_URL } from '../constant';
import { genAuth } from '../fixture';
import { genCtx, getSession, login } from '../req/common';
import {
  getConfigMapYaml,
  patchConfigMapYaml,
  updateConfigMapYaml,
} from '../utils/devportal-config';
import { restartDevPortal } from '../utils/shell';

test.describe('Admin sidebar', () => {
  test.setTimeout(120_000);

  const adminAuth = genAuth(`admin-sidebar-${Date.now()}`);
  const storagePath = path.resolve(
    process.cwd(),
    `apps/site-e2e/test-results/.auth/${adminAuth.name}.json`,
  );
  let defaultConfig: string | null = null;

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(600_000);
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    defaultConfig = await getConfigMapYaml();

    const ctx = await genCtx();
    await login(ctx, adminAuth);
    const { user } = await (await getSession(ctx)).json();
    await ctx.dispose();
    await patchConfigMapYaml<ConfigMapData>((config) => {
      config.auth.adminUserIds = Array.from(
        new Set([...(config.auth.adminUserIds || []), user.id]),
      );
    });
    await restartDevPortal();

    const adminCtx = await genCtx();
    await login(adminCtx, adminAuth);
    await adminCtx.storageState({ path: storagePath });
    await adminCtx.dispose();
  });

  test.afterAll(async () => {
    if (defaultConfig) {
      await updateConfigMapYaml(defaultConfig);
      await restartDevPortal();
    }
  });

  test('every sidebar entry can be clicked', async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: E2E_TARGET_URL,
      storageState: storagePath,
    });
    try {
      const page = await context.newPage();
      await page.goto(PATH_DASHBOARD_ORGANIZATIONS);
      const sidebar = page.locator('[data-slot="sidebar"]');

      // `trial` fails if something else, such as the navbar, would get the click.
      for (const name of ['Users', 'Organizations', 'Approvals']) {
        await sidebar
          .getByRole('link', { name })
          .click({ trial: true, timeout: 5_000 });
      }
      await sidebar.getByRole('link', { name: 'Users' }).click();
      await expect(page).toHaveURL(/\/admin\/users/);
    } finally {
      await context.close();
    }
  });
});
