import { expect } from '@playwright/test';

import { test } from '../fixture';
import {
  a7PostGatewayProduct,
  a7DeleteProductList,
  httpbinRawOAS,
} from '../req/dashboard/product';
import {
  a7PostPublishedService,
  a7PutServiceOAS,
  a7DeleteService,
} from '../req/dashboard/service';
import {
  uiAddApplication,
  uiDeleteCredential,
  uiGoToAPICredentials,
  uiGoToApplications,
} from '../utils/ui';
import { PATH_APPLICATIONS } from '@site/constants/path-prefix';

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
      auth: { 'basic-auth': {} },
    });
    productId = product.value.id;
  });

  test.afterAll(async ({ a7Ctx }) => {
    // clean up
    await a7DeleteProductList(a7Ctx);
    await a7DeleteService(a7Ctx, serviceId, gateway_group_id);
  });

  test('basic auth type should auto selected', async ({ page }) => {
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

    const title = page.getByTestId('meta-name').getByText(productName);
    await expect(title).toBeVisible();

    await page.getByRole('button', { name: 'Test Request' }).first().click();

    const authType = page.locator(
      '#headlessui-popover-button-scalar-client-15:has-text("Basic Authentication")'
    );
    await expect(authType).toBeVisible();

    // close modal
    const closeButton = page.locator('.app-exit-button');
    await closeButton.click();

    // go to credential page and add one credential
    await uiGoToAPICredentials(page, applicationId);

    // click add credential
    await page.getByRole('tab', { name: 'Basic Authentication' }).click();
    const addBtn = page.getByRole('button', {
      name: 'Add Basic Authentication',
    });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const addTitle = page
      .getByRole('dialog')
      .getByText('Add Basic Authentication Credential', { exact: true });
    await expect(addTitle).toBeVisible();

    // fill in credential name and auth info
    const basicAuth = 'basicAuth';
    await page.locator('input#name').fill(basicAuth);
    await page.locator('input#basic-auth_username').fill('testuser');
    await page.locator('input#basic-auth_password').fill('testpass');

    const addSubmit = page.getByRole('button', { name: 'Add', exact: true });
    await addSubmit.click();
    await expect(addTitle).toBeHidden();

    // click name show detail
    await page.locator(`a:has-text("${basicAuth}")`).click();

    // go to product detail page
    await page.goto(`/api-hub/detail?id=${productId}`);

    await page.getByRole('button', { name: 'Test Request' }).first().click();

    // should see auth type
    await expect(authType).toBeVisible();

    // should see username and password fields
    const usernameField = page.getByLabel('API Client').getByText('Username');
    const passwordField = page.getByLabel('API Client').getByText('Password', { exact: true })
    await expect(usernameField).toBeVisible();
    await expect(passwordField).toBeVisible();

    // close modal
    await closeButton.click();

    // delete credential
    await uiGoToAPICredentials(page, applicationId);
    await page.getByRole('tab', { name: 'Basic Authentication' }).click();
    const defaultBasicAuth = page.getByRole('cell', { name: basicAuth });
    await uiDeleteCredential(page, defaultBasicAuth);
  });
});
