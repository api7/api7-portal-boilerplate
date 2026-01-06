import { uiShowLogin } from '../../utils/ui';
import { PATH_API_HUB, PATH_LOGIN } from '@site/constants/path-prefix';
import { test } from '../../fixture';
import { a7PutPublicAccess } from '../../req/dashboard/common';
import {
  a7DeleteProductList,
  a7PostExternalProduct,
} from '../../req/dashboard/product';
import { expect } from '@playwright/test';
import { genCanViewPages, genNotFoundPages } from './utils/helper';

// Reset storage state for this file to avoid being authenticated
test.use({ storageState: { cookies: [], origins: [] } });

const autoJumpPages = [...genCanViewPages(), ...genNotFoundPages()];

test.describe('public access is `false`, test the behavior of guest users visiting pages', async () => {
  let productId: string;

  test.beforeAll(async ({ a7Ctx }) => {
    // create product
    productId = (await a7PostExternalProduct(a7Ctx)).value.id;
    // set site public access off
    await a7PutPublicAccess(a7Ctx, false);
  });

  test.afterAll(async ({ a7Ctx }) => {
    await a7DeleteProductList(a7Ctx, [productId]);
    // set site public access on
    await a7PutPublicAccess(a7Ctx, true);
  });

  autoJumpPages.forEach(async (url) => {
    test(`jump from '${url}' to login`, async ({ page }) => {
      await page.goto(url);
      await page.waitForURL(new RegExp(`.*${PATH_LOGIN}.*`));
      expect(page.url()).toContain(PATH_LOGIN);
      await uiShowLogin(page);
    });
  });

  test(`jump from exist product to login`, async ({ page }) => {
    await page.goto(`${PATH_API_HUB}/detail?id=${productId}`);
    await page.waitForURL(new RegExp(`.*${PATH_LOGIN}.*`));
    expect(page.url()).toContain(PATH_LOGIN);
    await uiShowLogin(page);
  });
});
