import { expect } from '@playwright/test';
import { PATH_APPLICATIONS } from '@site/constants/path-prefix';

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
  uiClickCellButton,
  uiGoToAPICredentials,
  uiGoToApplications,
} from '../utils/ui';

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
    test.slow();
    await test.step('add application', async () => {
      await uiGoToApplications(page);
      await uiAddApplication(page, { name: applicationName });
      await uiGoToApplications(page);
      await page.getByText(applicationName).click();
      await page.waitForURL(new RegExp(`${PATH_APPLICATIONS}/[^/]+$`));
      // get application id
      applicationId = page.url().split('/').pop()!;
    });

    await page.goto('/');
    const apihub = page.getByRole('link', { name: 'API Hub' });
    await expect(apihub).toBeVisible();
    await apihub.click();
    const pet = page.getByRole('link', { name: productName }).first();
    await pet.click();

    const title = page.getByTestId('meta-name').getByText(productName);
    await expect(title).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Test Request' }).first().click();

    const authType = page.locator(
      '[id^="headlessui-popover-button-scalar-client"]:has-text("Key Authentication")',
    );
    await expect(authType).toBeVisible();

    // close modal
    const closeButton = page.locator('.app-exit-button');
    await closeButton.click();

    // go to credential page and add one credential
    await uiGoToAPICredentials(page, applicationId);

    // click add credential
    const button = page.locator(
      'button:has-text("Add Key Authentication Credential")',
    );
    await button.click();

    // fill in credential name (the key is auto-generated)
    const keyAuth2 = 'keyAuth2';
    await page.locator('#name').fill(keyAuth2);

    await page
      .getByTestId('drawer-footer')
      .locator('button:has-text("Add")')
      .click();

    // open the credential detail: the key is view-once, so the detail no longer
    // exposes it — it shows a notice instead of the masked value.
    const credentialCell = page.getByRole('cell', { name: keyAuth2 });
    await uiClickCellButton(credentialCell, keyAuth2);

    await expect(page.getByText(/only shown once/i)).toBeVisible();
    await expect(page.getByText('********')).toBeHidden();

    // the product's declared auth scheme is still auto-selected in Test Request
    await page.goto(`/api-hub/${productId}`);
    await page.getByRole('button', { name: 'Test Request' }).first().click();
    await expect(authType).toBeVisible();

    // close modal
    await closeButton.click();
  });
});
