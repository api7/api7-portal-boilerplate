import { expect } from '@playwright/test';

import { test } from '../fixture';
import {
  a7DeleteProductList,
  a7PostGatewayProduct,
  httpbinRawOAS,
} from '../req/dashboard/product';
import {
  a7DeleteService,
  a7PostPublishedService,
  a7PutServiceOAS,
} from '../req/dashboard/service';
import {
  uiAddApplication,
  uiGoToAPICredentials,
  uiGoToApplications,
  uiSubscribeProductInAPIHub,
} from '../utils/ui';
import { PATH_APPLICATIONS } from '@site/constants/path-prefix';
import { API_PRODUCTS } from '../req/dashboard/constant';

const gateway_group_id = 'default';
const random = Math.random().toString(36).substring(7);

const serviceName = `test-${random}`;
let serviceId: string;

const productName = `product-${random}`;
let productId: string;

const applicationName = `application-${random}`;
let applicationId: string;

test.describe('auth type auto fill in detail page', () => {
  test.beforeAll(async ({ a7Ctx }) => {
    const service = await a7PostPublishedService(a7Ctx, gateway_group_id, {
      name: serviceName,
      hosts: ['12.12.12.12'],
      path_prefix: '/test',
    });
    serviceId = service.value.id;

    await a7PutServiceOAS(a7Ctx, gateway_group_id, serviceId, httpbinRawOAS);

    const product = await a7PostGatewayProduct(a7Ctx, {
      name: productName,
      status: 'published',
      linked_gateway_services: [
        {
          service_id: serviceId,
          gateway_group_id,
        },
      ],
      auth: { 'key-auth': {} },
    });
    productId = product.value.id;
  });

  test.afterAll(async ({ a7Ctx }) => {
    // clean up
    await a7DeleteProductList(a7Ctx);
    await a7DeleteService(a7Ctx, serviceId, gateway_group_id);
  });

  test('auth type should auto selected', async ({ page, ctx }) => {
    await test.step('add application', async () => {
      await uiGoToApplications(page);
      await uiAddApplication(page, { name: applicationName });
      await uiGoToApplications(page);
      await page.getByText(applicationName).click();
      await page.waitForURL(new RegExp(`${PATH_APPLICATIONS}/detail.*`));
      // get application id
      applicationId = page.url().split('?')[1].split('=')[1];
    });

    await page.goto('/');
    const apihub = page.getByRole('link', { name: 'API Hub' });
    await expect(apihub).toBeVisible();
    await apihub.click();
    const pet = page.getByRole('link', { name: productName }).first();
    await pet.click();

    const productDetailRes = await ctx.get(`${API_PRODUCTS}/${productId}`);
    expect(productDetailRes.status()).toBe(200);
    const productDetail = await productDetailRes.json();
    const authHeader = productDetail?.auth?.['key-auth']?.header;
    expect(authHeader, 'expected key-auth header in product detail').toBeTruthy();

    const title = page.getByTestId('meta-name').getByText(productName);
    await expect(title).toBeVisible();

    await page.getByRole('button', { name: 'Test Request' }).first().click();

    const authType = page.locator(
      '[id^="headlessui-popover-button-scalar-client"]:has-text("Key Authentication")'
    );
    await expect(authType).toBeVisible();

    // close modal
    const closeButton = page.locator('.app-exit-button');
    await closeButton.click();

    // go to credential page and add one credential
    await uiGoToAPICredentials(page, applicationId);

    // click add credential
    const button = page.locator(
      'button:has-text("Add Key Authentication Credential")'
    );
    await button.click();

    // fill in credential name
    const keyAuth2 = 'keyAuth2';
    await page.locator('#name').fill(keyAuth2);

    await page
      .locator('.ant-drawer-footer')
      .locator('button:has-text("Add")')
      .click();

    // click name show detail
    await page.locator(`a:has-text("${keyAuth2}")`).click();

    // click copy
    await page.locator('#copy-img').click();

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );

    // subscribe product to application
    await uiSubscribeProductInAPIHub(page, {
      applicationName,
      productId,
    });

    // go to product detail page
    await page.goto(`/api-hub/detail?id=${productId}`);

    await page.getByRole('button', { name: 'Test Request' }).first().click();

    // should see auth type and key
    await expect(authType).toBeVisible();
    await page.getByLabel('API Client').getByRole('button', { name: 'Show Password' }).click();

    const token = page.getByText(clipboardText);
    await expect(token).toBeVisible();

    const authHeaderElement = page
      .getByLabel('API Client')
      .getByRole('textbox')
      .first();
    await expect(authHeaderElement).toContainText(authHeader);

    // close modal
    await closeButton.click();
  });
});
