import { expect } from '@playwright/test';
import { PATH_API_HUB, PATH_ROOT } from '@site/constants/path-prefix';
import { ConfigMapData } from '@site/lib/config/schema';

import { test } from '../fixture';
import { getConfigMapYaml, patchConfigMapYaml, updateConfigMapYaml } from '../utils/devportal-config';
import { restartDevPortal } from '../utils/shell';
import { uiShowNotFound } from '../utils/ui';

test.describe('Test API Hub Disabled Configuration', () => {
  test.setTimeout(600_000);

  let defaultConfig: string | null = null;

  test.beforeAll(async () => {
    defaultConfig = await getConfigMapYaml();

    await patchConfigMapYaml<ConfigMapData>((cfg) => {
      cfg.app ??= {};
      cfg.app.apiHub = { enabled: false };
    });
    await restartDevPortal();
  });

  test.afterAll(async () => {
    if (defaultConfig) {
      await updateConfigMapYaml(defaultConfig);
      await restartDevPortal();
    }
  });

  test('nav bar should not show API Hub link', async ({ page }) => {
    await page.goto(PATH_ROOT);
    await expect(page.getByRole('link', { name: 'API Hub' })).not.toBeVisible();
  });

  test('/api-hub should return 404', async ({ page }) => {
    await page.goto(PATH_API_HUB);
    await uiShowNotFound(page);
  });

  test('/api-hub/{id} should return 404', async ({ page }) => {
    await page.goto(`${PATH_API_HUB}/some-product-id`);
    await uiShowNotFound(page);
  });

  test('/{org-slug}/api-hub should return 404', async ({ page, auth }) => {
    await page.goto(`/${auth.organization}${PATH_API_HUB}`);
    await uiShowNotFound(page);
  });

  test('/{org-slug}/api-hub/{id} should return 404', async ({ page, auth }) => {
    await page.goto(`/${auth.organization}${PATH_API_HUB}/some-product-id`);
    await uiShowNotFound(page);
  });

  test('sitemap.xml should not contain /api-hub URLs', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).not.toContain(PATH_API_HUB);
  });
});
