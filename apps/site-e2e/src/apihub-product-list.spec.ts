import { expect } from '@playwright/test';
import { test } from '../fixture';
import {
  PATH_ROOT,
} from '@site/constants/path-prefix';
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
    const pageSize = await page
      .locator('.ant-select-content-value')
      .textContent();
    expect(pageSize).toBe('20 / page');
    const httpbinElements = page.getByText('httpbin');
    await expect(httpbinElements).toHaveCount(20);

    // expect 1-20 of 21 text to be visible
    const page1 = page.getByText('1-20 of 21');
    await expect(page1).toBeVisible();

    // expect url to be /api-hub?page=1&page_size=20
    expect(page.url()).toContain('/api-hub?page=1&page_size=20');

    // click next page
    const nextPage = page.getByLabel('Next page').locator('img');
    await nextPage.click();

    // expect url to be /api-hub?page=2&page_size=20
    await page.waitForTimeout(500); // wait for url to change
    expect(page.url()).toContain('/api-hub?page=2&page_size=20');

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

    // Assert URL is redirected to default page_size=10
    await expect(page).toHaveURL(/.*\/api-hub\?page=1&page_size=10/);

    // Optional: verify pagination shows "10 / page"
    const pageSize = await page
      .locator('.ant-select-content-value')
      .textContent();
    expect(pageSize).toBe('10 / page');
  });

  test('invalid page should be reset to the last page', async ({ page }) => {
    await page.goto(`${PATH_ROOT}api-hub?page=3&page_size=20`);
    await expect(page).toHaveURL(/.*\/api-hub\?page=2&page_size=20/);
  });
});
