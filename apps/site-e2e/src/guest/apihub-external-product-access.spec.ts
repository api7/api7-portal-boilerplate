import { expect } from '@playwright/test';
const API_PRODUCTS = '/api/api_products';
import { PATH_API_HUB, PATH_LOGIN } from '@site/constants/path-prefix';
import type { ProductListRes } from '@site/types/portal-sdk';

import { HTTPBIN_URL } from '../../constant';
import { test } from '../../fixture';
import { a7DeleteProductList } from '../../req/dashboard/product';
import { a7UICreateExternalProduct } from '../../utils/a7UI';
import { uiAPIHubSearchProduct, uiShowLogin } from '../../utils/ui';

// Reset storage state for this file to avoid being authenticated
test.use({ storageState: { cookies: [], origins: [] } });

test.describe(
  'guest visit external products behavior',
  {
    tag: ['@user-story'],
  },
  async () => {
    const externalProductPublic = 'guest-external-public',
      externalProductLoggedIn = 'guest-external-logged-in';
    let externalProductPublicId: string, externalProductLoggedInId: string;
    test.beforeAll(async ({ a7UIPage, a7Ctx }) => {
      // clear env
      await a7DeleteProductList(a7Ctx);
      // create external product with visibility public
      externalProductPublicId = await a7UICreateExternalProduct(
        a7UIPage,
        externalProductPublic,
        'public',
        a7Ctx,
      );
      // create external product with visibility logged_in
      externalProductLoggedInId = await a7UICreateExternalProduct(
        a7UIPage,
        externalProductLoggedIn,
        'logged_in',
        a7Ctx,
      );
    });

    test.afterAll(async ({ a7Ctx }) => {
      await a7DeleteProductList(a7Ctx, [
        externalProductPublicId,
        externalProductLoggedInId,
      ]);
    });

    test('can see the external product, which is visibility=public', async ({
      page,
    }) => {
      test.slow();
      // can see in product list
      const productName = externalProductPublic;
      await uiAPIHubSearchProduct(page, productName);
      await page.route(`**${API_PRODUCTS}?page=1**`, async (route) => {
        const res = await route.fetch();
        const data = (await res.json()) as ProductListRes;
        expect(data.total).toBe(1);
        const info = data.list[0];
        expect(info.name).toBe(productName);
      });

      // can see in product detail
      const link = page.getByRole('link', { name: productName }).first();
      await link.click();

      const title = page.getByTestId('meta-name').getByText(productName);
      await expect(title).toBeVisible({ timeout: 15000 });
      const getOperationLink = page
        .locator('.scalar-app')
        .getByRole('button', { name: /\/get\b.*\bGET\b/i })
        .first();
      await expect(getOperationLink).toBeVisible({ timeout: 15000 });
      // detail page render well
      await expect(page.getByRole('button', { name: 'View ID' })).toBeVisible();
      await expect(getOperationLink).toBeVisible();
      // Subscriptions tab should be hidden for guests
      await expect(
        page.getByRole('tab', { name: 'Subscriptions' }),
      ).toBeHidden();
      await getOperationLink.click();

      // click Test Request
      await page.getByRole('button', { name: 'Test Request' }).first().click();
      const sendBtn = page.getByRole('button', {
        name: 'Send get request to http://',
      });
      await expect(sendBtn).toBeVisible();
      await sendBtn.click();
      await page.waitForResponse(
        (response) =>
          response.url().includes(`${HTTPBIN_URL}/get`) &&
          response.status() === 200,
      );

      // check response status code
      await expect(page.getByRole('link', { name: '200 OK' })).toBeVisible();
      // check response body
      const responseRegion = page.getByRole('region', { name: 'Response' });
      await responseRegion.getByRole('button', { name: 'Raw' }).click();
      const responseCode = responseRegion.getByRole('textbox');
      await expect(responseCode).toContainText(`${HTTPBIN_URL}/get`);
    });

    test('cannot see the external product, which is visibility=logged_in', async ({
      page,
    }) => {
      const productName = externalProductLoggedIn;
      const productId = externalProductLoggedInId;
      // cannot see product list
      await uiAPIHubSearchProduct(page, productName);
      await page.route(`**${API_PRODUCTS}?page=1**`, async (route) => {
        const res = await route.fetch();
        const data = (await res.json()) as ProductListRes;
        expect(data.total).toBe(0);
      });
      await expect(page.getByText(productName)).toBeHidden();

      // cannot see product detail — redirected to login
      await page.goto(`${PATH_API_HUB}/${productId}`);
      await page.waitForURL(new RegExp(`.*${PATH_LOGIN}.*`));
      await uiShowLogin(page);
    });
  },
);
