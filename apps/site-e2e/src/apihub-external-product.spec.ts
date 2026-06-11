import { expect } from '@playwright/test';
import {
  PATH_API_HUB,
  PATH_LOGIN,
  PATH_ROOT,
} from '@site/constants/path-prefix';
import type { ProductExternal, ProductListRes } from '@site/types/portal-sdk';

import { HTTPBIN_URL } from '../constant';
import { test } from '../fixture';
import {
  a7DeleteProduct,
  a7PostExternalProduct,
} from '../req/dashboard/product';
import { uiShowNotFound } from '../utils/ui';

test.describe('Test API Hub with External Product', () => {
  let productId: string;

  test.beforeAll(async ({ a7Ctx }) => {
    productId = (await a7PostExternalProduct(a7Ctx)).value.id;
  });

  test.afterAll(async ({ a7Ctx }) => {
    await a7DeleteProduct(a7Ctx, productId);
  });

  test('can visit api hub', async ({ page }) => {
    await page.goto(PATH_ROOT);
    const apihub = page.getByRole('link', { name: 'API Hub' });
    await expect(apihub).toBeVisible();
    await apihub.click();
    // search api
    const search = page.getByRole('textbox', { name: 'Search' });
    await expect(search).toBeVisible();
  });

  test('api hub list and detail with external product', async ({ page }) => {
    await page.goto(PATH_API_HUB);
    const search = page.getByRole('textbox', { name: 'Search' });
    const productName = 'httpbin';

    await test.step('Search not exist api', async () => {
      // search to get a not exist api
      await search.click();
      await search.fill('not_exist_api');
      await search.press('Enter');
      await expect(page.getByText('No Data')).toBeVisible();
    });

    await test.step('Search exist api', async () => {
      const productsResPromise = page.waitForResponse((response) => {
        if (
          response.request().method() !== 'GET' ||
          response.status() !== 200
        ) {
          return false;
        }

        const url = new URL(response.url());
        return (
          url.pathname.endsWith('/api_products') &&
          url.searchParams.get('page') === '1' &&
          url.searchParams.get('search') === productName
        );
      });

      // search to get a exist api
      await search.click();
      await search.clear();
      await search.fill(productName);
      await search.press('Enter');

      const productsRes = await productsResPromise;
      const data = (await productsRes.json()) as ProductListRes;
      expect(data.total).toBe(1);
      const httpbinInfo = data.list[0] as ProductExternal;
      expect(httpbinInfo.name).toBe(productName);

      const link = page.getByRole('link', { name: productName }).first();
      await expect(link).toBeVisible();
      await expect(page.getByText('No Data')).toBeHidden();
      await expect(page.getByText('API Count')).toBeVisible();
      await expect(page.getByText(String(httpbinInfo.api_count))).toBeVisible();
    });

    await test.step('Check exist api detail page', async () => {
      const link = page.getByRole('link', { name: productName }).first();
      await link.click();

      // tab should not exist
      await expect(
        page.getByRole('tab', { name: 'httpbin' }),
      ).not.toBeAttached();

      const title = page.getByTestId('meta-name').getByText(productName);
      await expect(title).toBeVisible({ timeout: 15000 });
      const getOperationLink = page
        .locator('.scalar-app')
        .getByRole('button', { name: /\/get\b.*\bGET\b/i })
        .first();
      await expect(getOperationLink).toBeVisible({ timeout: 15000 });
      // detail page render well
      await expect(page.getByText('ID:')).toBeVisible();
      await expect(getOperationLink).toBeVisible();
      // Subscriptions tab should NOT be visible for external products (they cannot be subscribed)
      await expect(
        page.getByRole('tab', { name: 'Subscriptions' }),
      ).not.toBeVisible();
      await getOperationLink.click();
      await expect(
        page
          .locator('li')
          .filter({ hasText: 'get response' })
          .getByRole('paragraph'),
      ).toBeVisible();

      // click Test Request
      await page.getByRole('button', { name: 'Test Request' }).first().click();
      const sendBtn = page.getByRole('button', {
        name: 'Send get request to http://',
      });
      await expect(sendBtn).toBeVisible();
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes(`${HTTPBIN_URL}/get`) &&
            response.status() === 200,
        ),
        sendBtn.click(),
      ]);

      // check response status code
      await expect(page.getByRole('link', { name: '200 OK' })).toBeVisible();
      // check response body
      const responseRegion = page.getByRole('region', { name: 'Response' });
      await responseRegion.getByRole('button', { name: 'Raw' }).click();
      const responseCode = responseRegion.getByRole('textbox');
      await expect(responseCode).toContainText(`${HTTPBIN_URL}/get`);
    });

    await test.step('test request modal should trim paste text', async () => {
      const password = page
        .getByLabel('API Client')
        .getByPlaceholder('********');
      await expect(password).toBeVisible();
      await password.press('Enter');
      await expect(password).toBeVisible();

      const testText = '   test space    ';
      const cookieInput = page
        .getByLabel('Cookies')
        .getByRole('textbox')
        .first();
      await cookieInput.fill(testText);

      await cookieInput.press('ControlOrMeta+a');
      await cookieInput.press('ControlOrMeta+c');
      await cookieInput.press('ControlOrMeta+v');
      await expect(cookieInput).toContainText(testText.trim());

      // close modal
      await page.getByRole('button', { name: 'Close Client' }).click();
      // wait, and detail page should be visible
      await expect(
        page
          .locator('li')
          .filter({ hasText: 'get response' })
          .getByRole('paragraph'),
      ).toBeVisible();

      // reload, should not go to LOGIN PAGE, which means that the cookies have not been cleared.
      // This is a problem caused by the new version of scalar. When upgrading this dependency, we need to ensure that this problem does not happen again.
      // ref: https://github.com/scalar/scalar/issues/3220, https://github.com/scalar/scalar/issues/3701
      await page.reload();
      // eslint-disable-next-line playwright/no-wait-for-timeout
      await page.waitForTimeout(1000);
      expect(page.url()).not.toContain(PATH_LOGIN);
    });
  });

  test('api hub should show 404 page, when the api not exist', async ({
    page,
  }) => {
    const id = 'not_exist_id';
    const url = `/api-hub/${id}`;
    await page.goto(url);
    expect(page.url()).toContain(id);
    await uiShowNotFound(page);
  });
});
