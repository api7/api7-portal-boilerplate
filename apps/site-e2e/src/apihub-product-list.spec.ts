import { expect } from '@playwright/test';
import { PATH_ROOT } from '@site/constants/path-prefix';

import { test } from '../fixture';
import {
  a7DeleteProductList,
  a7PostExternalProduct,
} from '../req/dashboard/product';

test.describe('Test API Hub with Product List Pagination', () => {
  const productIds: string[] = [];

  test.beforeAll(async ({ a7Ctx }) => {
    await a7DeleteProductList(a7Ctx);
    // Create 21 products, default page size is 10,
    // so we need to create 21 products to test pagination
    for (let i = 0; i < 21; i++) {
      const response = await a7PostExternalProduct(a7Ctx);
      productIds.push(response.value.id);
    }
  });

  test.afterAll(async ({ a7Ctx }) => {
    // Clean up all created products
    await a7DeleteProductList(a7Ctx, productIds);
  });

  test('set page size to 20', async ({ page }) => {
    await page.goto(PATH_ROOT);
    const apihub = page.getByRole('link', { name: 'API Hub' });
    await expect(apihub).toBeVisible();
    await apihub.click();

    const pageSizeSelector = page.locator('.ant-select');
    await pageSizeSelector.click();

    // Assert and click "20 / page" option
    const option20 = page.getByTitle('20 / page');
    await expect(option20).toBeVisible();
    await option20.click();

    // check page size is 20 and page have 2 pages, 20 products per page
    const pageSizeValue = page.getByText(/\b20\s*\/\s*page\b/);
    await expect(pageSizeValue).toBeVisible();
    const httpbinElements = page.getByText('httpbin');
    await expect(httpbinElements).toHaveCount(20);

    // expect 1-20 of 21 text to be visible
    const page1 = page.getByText('1-20 of 21');
    await expect(page1).toBeVisible();

    // current implementation normalizes pagination query params from URL
    expect(page.url()).toContain('/api-hub');

    // click next page
    const nextPage = page.getByLabel('Next page').locator('img');
    await nextPage.click();

    expect(page.url()).toContain('/api-hub');

    // expect 21-21 of 21 text to be visible
    const page2 = page.getByText('21-21 of 21');
    await expect(page2).toBeVisible();

    // expect httpbin elements to be 1
    const httpbinElements2 = page.getByText('httpbin');
    await expect(httpbinElements2).toHaveCount(1);
  });

  test('invalid page size should be reset to 10', async ({ page }) => {
    // Visit URL with invalid page_size
    await page.goto(`${PATH_ROOT}api-hub?page=1&page_size=21`);

    // Assert URL is normalized to API Hub root
    await expect(page).toHaveURL(/.*\/api-hub/);

    // Optional: verify pagination shows page size 10
    const pageSizeValue = page.getByText(/\b10\s*\/\s*page\b/);
    await expect(pageSizeValue).toBeVisible();
    await expect(page.getByText('1-10 of 21')).toBeVisible();
  });

  test('invalid page should be reset to the last page', async ({ page }) => {
    await page.goto(`${PATH_ROOT}api-hub?page=3&page_size=20`);
    await expect(page).toHaveURL(/.*\/api-hub/);
    await expect(page.getByText('1-10 of 21')).toBeVisible();
  });
});
