import { expect } from '@playwright/test';
import { PATH_APPLICATIONS } from '@site/constants/path-prefix';
import type { ProductGateway } from '@site/types/portal-sdk';

import { test } from '../fixture';
import { deleteAllApplications } from '../req/common';
import {
  a7DeleteProductList,
  a7PostGatewayProduct,
  httpbinRawOAS,
} from '../req/dashboard/product';
import {
  a7DeletePublishedRoute,
  a7PostPublishedRoute,
} from '../req/dashboard/route';
import {
  a7DeleteService,
  a7PostPublishedService,
  a7PutServiceOAS,
} from '../req/dashboard/service';
import {
  uiAddApplication,
  uiDeleteApplicationInList,
  uiGoToApplications,
  uiVerifyToast,
} from '../utils/ui';

test.describe('Test SubscribeAPIProductModal auto refresh status after subscription', () => {
  let serviceId: string;
  let routeId: string;
  let waitApprovalProductId: string;
  const gatewayGroupId = 'default';
  const seed = (+Date.now()).toString();
  const serviceName = `subscribe-modal-service-${seed}`;

  const waitApprovalProduct: DeepPartial<ProductGateway> = {
    name: `Wait Approval Product-${seed}`,
    labels: { test: `wait${seed}` },
    desc: `Wait approval product ${seed}`,
    subscription_auto_approval: false,
    can_view_unsubscribed: false,
  };

  test.beforeAll(async ({ a7Ctx }) => {
    await Promise.all([
      a7PostPublishedService(a7Ctx, gatewayGroupId, {
        name: serviceName,
        upstream: {
          name: 'default',
          scheme: 'http',
          type: 'roundrobin',
          nodes: [
            {
              host: '127.0.0.1',
              port: 1234,
              weight: 100,
            },
          ],
        },
      }).then(async (res) => {
        serviceId = res.value.id;
        // post route
        const routeRes = await a7PostPublishedRoute(a7Ctx, gatewayGroupId, {
          name: 'test-route',
          service_id: serviceId,
          paths: ['/get'],
        });
        routeId = routeRes.value.id;
        // put openapi
        await a7PutServiceOAS(a7Ctx, gatewayGroupId, serviceId, httpbinRawOAS);
        // post wait approval product
        const waitProductRes = await a7PostGatewayProduct(a7Ctx, {
          ...waitApprovalProduct,
          linked_gateway_services: [
            {
              gateway_group_id: gatewayGroupId,
              service_id: serviceId,
            },
          ],
          auth: { 'key-auth': {} },
        });
        waitApprovalProductId = waitProductRes.value.id;
      }),
    ]);
  });

  test.afterAll(async ({ a7Ctx, ctx }) => {
    await deleteAllApplications(ctx);
    await a7DeleteProductList(a7Ctx, [waitApprovalProductId]);
    await a7DeletePublishedRoute(a7Ctx, routeId, gatewayGroupId);
    await a7DeleteService(a7Ctx, serviceId, gatewayGroupId);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(PATH_APPLICATIONS);
    // Clean up any existing test applications
    const rows = (await page.getByRole('row').all()).slice(1);
    for (const row of rows) {
      const nameCell = row.getByRole('cell').first();
      const appName = await nameCell.textContent();
      if (appName && appName.includes(seed)) {
        await uiDeleteApplicationInList(page, appName);
      }
    }
  });

  test('subscription status should update in modal after subscribing to wait approval product', async ({
    page,
  }) => {
    const applicationName = `test-app-wait-${seed}`;

    await test.step('create new application', async () => {
      await uiAddApplication(page, {
        name: applicationName,
        desc: 'Test application for wait approval testing',
        label: { key: 'env', value: 'test' },
      });
    });

    await test.step('navigate to application subscriptions tab', async () => {
      const nameCell = page.getByRole('cell', { name: applicationName });
      const nameLink = nameCell.getByRole('link', { name: applicationName });
      await nameLink.click();
      await page.getByRole('tab', { name: 'Subscriptions' }).click();
    });

    await test.step('subscribe to wait approval product', async () => {
      await page
        .getByRole('button', { name: 'Subscribe to New API Product' })
        .click();

      const dialog = page.getByRole('dialog', {
        name: 'Subscribe to New API Product',
      });
      await expect(dialog).toBeVisible();

      // Open dropdown and select product
      const searchInput = dialog
        .locator('[data-slot="combobox-chips"]')
        .first();
      await expect(searchInput).toBeVisible();
      await searchInput.click({ force: true });
      await page.waitForTimeout(1000);

      const waitOption = page
        .locator('[data-slot="combobox-item"]')
        .filter({ hasText: waitApprovalProduct.name })
        .first();
      await expect(waitOption).toBeVisible();

      await waitOption.click();

      // Close dropdown
      await dialog.getByText('Subscribe to New API Product').click();
      await page.waitForTimeout(500);

      // Submit subscription
      const subscribeButton = dialog.getByRole('button', {
        name: 'Subscribe',
        exact: true,
      });
      await expect(subscribeButton).toBeEnabled();
      await subscribeButton.click();

      await expect(dialog).toBeHidden();
      await uiVerifyToast(page, {
        hasText: 'Subscribed to API Product Successfully',
      });
    });

    await test.step('verify subscription appears in table with pending status', async () => {
      const productNameCell = page.getByRole('cell', {
        name: waitApprovalProduct.name,
      });
      await expect(productNameCell).toBeVisible();
      const row = productNameCell.locator('xpath=..');
      const statusCell = row.getByText('Wait For Approval');
      await expect(statusCell).toBeVisible();
    });

    await test.step('open modal again and verify product status is updated to pending approval', async () => {
      await page
        .getByRole('button', { name: 'Subscribe to New API Product' })
        .click();

      const dialog = page.getByRole('dialog', {
        name: 'Subscribe to New API Product',
      });
      await expect(dialog).toBeVisible();

      // Open dropdown
      const searchInput = dialog
        .locator('[data-slot="combobox-chips"]')
        .first();
      await expect(searchInput).toBeVisible();
      await searchInput.click({ force: true });
      await page.waitForTimeout(1000);

      // Verify the product now shows as pending approval and is disabled
      const waitOption = page
        .locator('[data-slot="combobox-item"]')
        .filter({ hasText: waitApprovalProduct.name })
        .first();
      await expect(waitOption).toBeVisible();

      // The modal should now render the product as non-selectable.
      await expect(waitOption).toHaveAttribute('data-disabled', '');
    });

    await test.step('delete application', async () => {
      await uiGoToApplications(page);
      await uiDeleteApplicationInList(page, applicationName);
    });
  });
});
