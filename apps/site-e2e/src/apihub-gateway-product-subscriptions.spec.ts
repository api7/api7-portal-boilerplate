import { expect } from '@playwright/test';
import { test } from '../fixture';
import { PATH_API_HUB } from '@site/constants/path-prefix';
import {
  a7DeleteProductList,
  a7PostGatewayProduct,
  httpbinRawOAS,
} from '../req/dashboard/product';
import type { ProductGateway } from '@site/types/portal-sdk';
import {
  a7DeleteService,
  a7PostPublishedService,
  a7PutServiceOAS,
} from '../req/dashboard/service';
import {
  a7DeletePublishedRoute,
  a7PostPublishedRoute,
} from '../req/dashboard/route';
import {
  uiAddApplication,
  uiGoToApplications,
  uiSubscribeProductInAPIHub,
  uiUnsubscribeProductInAPIHub,
} from '../utils/ui';
import { deleteAllApplications } from '../req/common';

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

    await test.step('cannot subscribe pending approval application', async () => {
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
      await subscribeBtn.click();
      await page.waitForTimeout(1000);
      const dialog = page.getByRole('dialog', {
        name: 'Subscribe Application to API Product',
      });
      await expect(dialog).toBeVisible();
      // input should be cleared
      await expect(dialog.getByText(applicationName)).toBeHidden();
      await expect(
        dialog.getByText('Search and select applications')
      ).toBeVisible();
      await page.waitForTimeout(1000);
      const searchEl = dialog.locator('.ant-select');
      // cause this is a div
      await searchEl.click({ force: true });
      await page.waitForTimeout(1000);
      // option should be visible
      const option = page.getByTestId(`option-${applicationName}`);
      await expect(option).toBeVisible();
      // the application should be Pending Approval
      await expect(page.getByText('Pending Approval')).toBeVisible();
      await option.click({ force: true, position: { x: 20, y: 0 } });
      // close dropdown
      await dialog.getByText('Subscribe Application to API Product').click();
      await page.waitForTimeout(1000);
      // the application should not be selected
      await expect(dialog.getByText(applicationName)).toBeHidden();
      await dialog
        .getByRole('button', { name: 'Subscribe', exact: true })
        .click({ force: true });
      await expect(
        page.getByText('Subscribe Application to API Product Successfully')
      ).toBeHidden();
      // dialog should not be closed
      await expect(dialog).toBeVisible();
    });

    await test.step('can unsubscribe product from application', async () => {
      await uiUnsubscribeProductInAPIHub(page, {
        applicationName,
        productId,
      });
    });
  });
});
