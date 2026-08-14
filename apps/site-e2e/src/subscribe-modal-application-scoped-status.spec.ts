import { expect } from '@playwright/test';

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
  uiSubscribeProductProduct,
} from '../utils/ui';

// Regression test for a subscription-status leak across applications.
test.describe('Subscribe modal reflects the current application only', () => {
  const seed = Date.now().toString();
  const gatewayGroupId = 'default';
  const productName = `subscribe-scope-product-${seed}`;
  const subscribedAppName = `subscribe-scope-subscribed-${seed}`;
  const otherAppName = `subscribe-scope-other-${seed}`;
  let serviceId: string | undefined;
  let routeId: string | undefined;
  let productId: string | undefined;

  test.beforeAll(async ({ a7Ctx }) => {
    const serviceRes = await a7PostPublishedService(a7Ctx, gatewayGroupId, {
      name: `subscribe-scope-service-${seed}`,
      upstream: {
        name: 'default',
        scheme: 'http',
        type: 'roundrobin',
        nodes: [{ host: '127.0.0.1', port: 1234, weight: 100 }],
      },
    });
    serviceId = serviceRes.value.id;

    const routeRes = await a7PostPublishedRoute(a7Ctx, gatewayGroupId, {
      name: `subscribe-scope-route-${seed}`,
      service_id: serviceId,
      paths: ['/get'],
    });
    routeId = routeRes.value.id;

    await a7PutServiceOAS(a7Ctx, gatewayGroupId, serviceId, httpbinRawOAS);

    const productRes = await a7PostGatewayProduct(a7Ctx, {
      name: productName,
      labels: { test: `scope${seed}` },
      linked_gateway_services: [
        { gateway_group_id: gatewayGroupId, service_id: serviceId },
      ],
      auth: { 'key-auth': {} },
    });
    productId = productRes.value.id;
  });

  test.afterAll(async ({ a7Ctx, ctx }) => {
    await deleteAllApplications(ctx);
    if (productId) await a7DeleteProductList(a7Ctx, [productId]);
    if (routeId) await a7DeletePublishedRoute(a7Ctx, routeId, gatewayGroupId);
    if (serviceId) await a7DeleteService(a7Ctx, serviceId, gatewayGroupId);
  });

  test('a product subscribed by one application still shows as unsubscribed for another', async ({
    page,
  }) => {
    await test.step('create the subscribed application and subscribe it to the product', async () => {
      await uiGoToApplications(page);
      await uiAddApplication(page, { name: subscribedAppName });
      await page
        .getByRole('cell', { name: subscribedAppName })
        .getByRole('link')
        .click();
      await page.getByRole('tab', { name: 'Subscriptions' }).click();
      await uiSubscribeProductProduct(page, { productName });
    });

    await test.step('create a second application and verify the product is not pre-marked as subscribed', async () => {
      await uiGoToApplications(page);
      await uiAddApplication(page, { name: otherAppName });
      await page
        .getByRole('cell', { name: otherAppName })
        .getByRole('link')
        .click();
      await page.getByRole('tab', { name: 'Subscriptions' }).click();

      await page
        .getByRole('button', { name: 'Subscribe to New API Product' })
        .click();
      const dialog = page.getByRole('dialog', {
        name: 'Subscribe to New API Product',
      });
      await expect(dialog).toBeVisible();

      const searchInput = dialog
        .locator('[data-slot="combobox-chips"]')
        .first();
      await searchInput.click({ force: true });

      const option = page
        .locator('[data-slot="combobox-item"]')
        .filter({ hasText: productName })
        .first();
      await expect(option).toBeVisible();
      // Not disabled here means this application's own (unsubscribed) status
      // was used, not the other application's subscribed status.
      await expect(option).not.toHaveAttribute('data-disabled', '');
    });

    await test.step('clean up', async () => {
      await uiGoToApplications(page);
      await uiDeleteApplicationInList(page, subscribedAppName);
      await uiDeleteApplicationInList(page, otherAppName);
    });
  });
});
