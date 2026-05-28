import { expect } from '@playwright/test';
import { PATH_API_HUB } from '@site/constants/path-prefix';
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
  uiGoToApplications,
  uiSubscribeProductInAPIHub,
} from '../utils/ui';

test.describe('subscription status should be updated when product is subscribed or unsubscribed', () => {
  let serviceId: string;
  let routeId: string;
  let productId: string;
  const gatewayGroupId = 'default';
  const seed = (+Date.now()).toString();
  const serviceName = `product-service-${seed}`;
  const product: DeepPartial<ProductGateway> = {
    name: `Wait Approval-${seed}`,
    labels: { test: `test${seed}` },
    desc: `desc${seed}`,
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
          name: 'test',
          service_id: serviceId,
          paths: ['/get'],
        });
        routeId = routeRes.value.id;
        // put openapi
        await a7PutServiceOAS(a7Ctx, gatewayGroupId, serviceId, httpbinRawOAS);
        // post product
        const productRes = await a7PostGatewayProduct(a7Ctx, {
          ...product,
          linked_gateway_services: [
            {
              gateway_group_id: gatewayGroupId,
              service_id: serviceId,
            },
          ],
          auth: { 'key-auth': {} },
        });
        productId = productRes.value.id;
      }),
    ]);
  });

  test.afterAll(async ({ a7Ctx, ctx }) => {
    await deleteAllApplications(ctx);
    await a7DeleteProductList(a7Ctx, [productId]);
    await a7DeletePublishedRoute(a7Ctx, routeId, gatewayGroupId);
    await a7DeleteService(a7Ctx, serviceId, gatewayGroupId);
  });

  test('can update subscription status in api hub > subscriptions', async ({
    page,
  }) => {
    const applicationName = `application-${seed}`;
    await test.step('create new application', async () => {
      await uiGoToApplications(page);
      await uiAddApplication(page, {
        name: applicationName,
      });
    });
    await test.step('subscribe product to application', async () => {
      await uiSubscribeProductInAPIHub(page, {
        applicationName,
        productId: productId,
      });
    });

    await test.step('pending approval application keeps subscribe action disabled', async () => {
      await page.goto(`${PATH_API_HUB}/detail?id=${productId}`);
      await page.getByRole('tab', { name: 'Subscriptions' }).click();

      // Verify the subscribed_at column shows 'Not yet' when subscription is pending approval
      // This assertion ensures that the 'invalid date' bug does not occur when subscribed_at is not returned
      const applicationRow = page
        .getByRole('row')
        .filter({ hasText: applicationName });
      await expect(applicationRow.getByText('Not yet')).toBeVisible();
      await expect(applicationRow.getByText('Wait For Approval')).toBeVisible();

      const subscribeBtn = page.getByRole('button', {
        name: 'Subscribe to Application',
      });
      await expect(subscribeBtn).toBeVisible();
      await expect(subscribeBtn).toBeDisabled();
    });

    await test.step('subscribed application keeps unsubscribe action disabled', async () => {
      await page.goto(`${PATH_API_HUB}/detail?id=${productId}`);
      await page.getByRole('tab', { name: 'Subscriptions' }).click();
      const row = page
        .getByRole('cell', { name: applicationName })
        .locator('xpath=..');
      const moreMenuBtn = row.getByTestId('more');
      await expect(moreMenuBtn).toBeVisible();
      await expect(moreMenuBtn).toBeDisabled();
    });
  });
});
