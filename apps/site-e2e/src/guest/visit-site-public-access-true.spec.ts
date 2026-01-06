import { a7PutPublicAccess } from '../../req/dashboard/common';
import {
  PATH_APPLICATIONS,
  PATH_LOGIN,
  PATH_ROOT,
} from '@site/constants/path-prefix';
import { test } from '../../fixture';
import { expect } from '@playwright/test';
import { a7DeleteProductList } from '../../req/dashboard/product';
import { uiShowNotFound } from '../../utils/ui';
import { genCanViewPages, genNotFoundPages } from './utils/helper';
import { headerNavs } from '@site/lib/config/navs';

// Reset storage state for this file to avoid being authenticated
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('public access is `true`, test the behavior of guest users visiting pages', async () => {
  const canViewPages = genCanViewPages();
  const notFoundPages = genNotFoundPages();
  let publicProductId: string, loggedInProductId: string;
  test.beforeAll(async ({ a7Ctx }) => {
    // We will have a separate file to use ui to test product related logic, here we just test accessibility
    await a7PutPublicAccess(a7Ctx, true);
  });

  test.afterAll(async ({ a7Ctx }) => {
    await a7DeleteProductList(a7Ctx, [publicProductId, loggedInProductId]);
  });

  test('cannot see applications, user menu in nav bar', async ({ page }) => {
    await page.goto(PATH_ROOT);
    // cannot see applications
    const applications = headerNavs.find((v) => v.href === PATH_APPLICATIONS);
    await expect(page.getByText(applications.title)).toBeHidden();
    // can see not applications
    const otherNavs = headerNavs.filter((v) => v.href !== PATH_APPLICATIONS);
    otherNavs.forEach(async (v) => {
      await expect(page.getByText(v.title)).toBeVisible();
    });

    // can see login button
    await page.getByRole('button', { name: 'Account' }).click();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  canViewPages.forEach(async (url) => {
    test(`${url} can be seen`, async ({ page }) => {
      await page.goto(url);
      expect(page.url()).toContain(url);
      await page.waitForTimeout(500);
      expect(page.url()).not.toContain(PATH_LOGIN);
    });
  });

  notFoundPages
    .filter((v) => v !== '/any_not_exist_page')
    .forEach(async (url) => {
      test(`${url} show not found`, async ({ page }) => {
        await page.goto(url);
        await uiShowNotFound(page);
      });
    });

  const anyNotExistPage = '/any_not_exist_page';
  test(`${anyNotExistPage} show 404 not found`, async ({ page }) => {
    await page.goto(anyNotExistPage);
    await uiShowNotFound(page);
  });
});
