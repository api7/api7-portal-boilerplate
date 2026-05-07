import { expect } from '@playwright/test';
import dayjs from 'dayjs';
import { test } from '../fixture';
import {
  a7DeleteProduct,
  a7PostGatewayProduct,
  httpbinRawOAS,
} from '../req/dashboard/product';
import type { ProductGateway } from '@site/types/portal-sdk';
import { k8HelmUninstall, k8DeployA7Gateway, k8PortForward } from '../utils/shell';
import {
  a7DeleteService,
  a7PostPublishedService,
  a7PutServiceOAS,
} from '../req/dashboard/service';
import { a7PostGateway } from '../req/dashboard/gateway';
import {
  a7DeletePublishedRoute,
  a7PostPublishedRoute,
} from '../req/dashboard/route';
import { uiAddAPIKeyCredential, uiGoToApplications, uiSubscribeProductProduct } from '../utils/ui';
import { HTTPBIN_URL } from '../constant';

test.describe('Test API Hub with Gateway Product', { tag: ['@gateway'] }, () => {
  let gatewayId: string;
  let serviceId: string;
  let routeId: string;
  let productId: string;
  const seed = (+Date.now()).toString();
  const serviceName = `product-service-${seed}`;
  const server = 'http://localhost:9080/';
  const product: DeepPartial<ProductGateway> = {
    name: `gateway-product-${seed}`,
    labels: { test: `test${seed}` },
    desc: `desc${seed}`,
    auth: {
      'key-auth': {},
    },
  };

  test.beforeAll(async ({ a7Ctx }) => {
    test.setTimeout(600_000);
    // ensure uninstall
    await k8HelmUninstall();

    // Step 1: Create gateway group
    const res = await a7PostGateway(a7Ctx, {
      name: `gateway-product-${seed}`,
    });
    gatewayId = res.value.id;

    // Step 2: Deploy gateway and wait for it to be ready (sequential)
    await k8DeployA7Gateway(a7Ctx, { gateway_group_id: gatewayId });
    await k8PortForward('svc/api7-ee-3-gateway-gateway', '9080:80');

    // Step 3: Create service, route, and product
    const serviceRes = await a7PostPublishedService(a7Ctx, gatewayId, {
      name: serviceName,
      upstream: {
        name: 'default',
        scheme: 'http',
        type: 'roundrobin',
        nodes: [
          {
            host: 'httpbin.default.svc',
            port: 80,
            weight: 100,
          },
        ],
      },
    });
    serviceId = serviceRes.value.id;

    // post route
    const routeRes = await a7PostPublishedRoute(a7Ctx, gatewayId, {
      name: 'test',
      service_id: serviceId,
      paths: ['/get'],
    });
    routeId = routeRes.value.id;

    // put openapi
    await a7PutServiceOAS(
      a7Ctx,
      gatewayId,
      serviceId,
      httpbinRawOAS.replace(`- url: ${HTTPBIN_URL}`, `- url: ${server}`)
    );

    // post product
    const productRes = await a7PostGatewayProduct(a7Ctx, {
      ...product,
      linked_gateway_services: [
        {
          gateway_group_id: gatewayId,
          service_id: serviceId,
        },
      ],
      auth: { 'key-auth': {} },
    });
    productId = productRes.value.id;
  });

  test.afterAll(async ({ a7Ctx }) => {
    test.setTimeout(600_000);
    await k8HelmUninstall();
    await a7DeleteProduct(a7Ctx, productId);
    await a7DeletePublishedRoute(a7Ctx, routeId, gatewayId);
    await a7DeleteService(a7Ctx, serviceId, gatewayId);
  });

  test('applications usage', async ({
    page,
  }) => {
    // Increase the timeout due to waiting of k8s deployment
    test.setTimeout(600_000);
    let applicationId = '';
    await test.step('navigate to application detail', async () => {
      await uiGoToApplications(page);
      const nameCell = page.getByRole('cell', { name: 'default' });
      const nameLink = nameCell.getByRole('link', { name: 'default' });
      await nameLink.click();
      await expect(page).toHaveURL(/\/applications\/detail\?id=.+$/);
      // Extract application ID from URL
      const url = page.url();
      const match = url.match(/id=([^&]+)/);
      applicationId = match?.[1];
      expect(applicationId).toBeDefined();
      await uiAddAPIKeyCredential(page);
    });

    await test.step('subscribe product', async () => {
      await page.getByRole('tab', { name: 'Subscriptions' }).click();
      await uiSubscribeProductProduct(page, {
        productName: product.name
      });
    });

    await test.step('usage filter logic', async () => {
      await page.getByRole('tab', { name: 'Usage' }).click();

       // check network request have correct params
       await page.route('**/api/applications/api_calls', async (route, request) => {
        const params = request.postData();
        const data = JSON.parse(params);
        // check start_at and end_at
        expect(data.start_at).toBe(dayjs().startOf('day'));
        expect(data.end_at).toBe(dayjs().endOf('day'));

        // check application_id
        expect(data.application_id).toBe(applicationId);

        // check product_id should not exist
        expect(data.product_id).toBeUndefined();

        // check credential_id should not exist
        expect(data.credential_id).toBeUndefined();

        await route.continue();
      });

      // check default start date and end date
      await expect(page.getByPlaceholder('Start date')).toHaveValue(dayjs().startOf('day').format('YYYY-MM-DD HH:mm:ss'));
      await expect(page.getByPlaceholder('End date')).toHaveValue(dayjs().endOf('day').format('YYYY-MM-DD HH:mm:ss'));

      await page.getByTestId('application-usage-filter-product').click();
      await page.getByText('gateway-product-').click();
      await page.getByTestId('application-usage-filter-credential').click();
      await page.getByText('default-key-auth').click();

      let defaultKeyAuthId = '';
      // intercept network request to get default-key-auth id
      await page.route(`**/api/credentials?application_id=${applicationId}`, async (route) => {
        const res = await route.fetch();
        const data = await res.json();
        defaultKeyAuthId = data.data.find((item: { name: string }) => item.name === 'default-key-auth')?.id;
        await route.continue();
      })

        // check network request have correct params
        await page.route('**/api/applications/api_calls', async (route, request) => {
          const params = request.postData();
          const data = JSON.parse(params);
          // check start_at and end_at
          expect(data.start_at).toBe(dayjs().startOf('day'));
          expect(data.end_at).toBe(dayjs().endOf('day'));
  
          // check application_id
          expect(data.application_id).toBe(applicationId);

          // check product_id should exist
          expect(data.product_id).toBe(productId);
  
          // check credential_id should exist
          expect(data.credential_id).toBe(defaultKeyAuthId);
  
          await route.continue();
        });
    });
  });
});
