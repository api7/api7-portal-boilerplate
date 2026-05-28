import { expect } from '@playwright/test';
import type { ProductGateway } from '@site/types/portal-sdk';
import dayjs from 'dayjs';

import { HTTPBIN_URL } from '../constant';
import { test } from '../fixture';
import { a7PostGateway } from '../req/dashboard/gateway';
import {
  a7DeleteProduct,
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
  k8DeployA7Gateway,
  k8HelmUninstall,
  k8PortForward,
} from '../utils/shell';
import {
  uiAddAPIKeyCredential,
  uiGoToApplications,
  uiSubscribeProductProduct,
} from '../utils/ui';

test.describe(
  'Test API Hub with Gateway Product',
  { tag: ['@gateway'] },
  () => {
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
        httpbinRawOAS.replace(`- url: ${HTTPBIN_URL}`, `- url: ${server}`),
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

    test('applications usage', async ({ page }) => {
      // Increase the timeout due to waiting of k8s deployment
      test.setTimeout(600_000);
      let applicationId: string | null = null;
      const productName = product.name ?? `gateway-product-${seed}`;
      await test.step('navigate to application detail', async () => {
        await uiGoToApplications(page);
        const nameCell = page.getByRole('cell', { name: 'default' });
        const nameLink = nameCell.getByRole('link', { name: 'default' });
        await nameLink.click();
        await expect(page).toHaveURL(/\/applications\/detail\?id=.+$/);
        // Extract application ID from URL
        const url = page.url();
        const match = url.match(/id=([^&]+)/);
        applicationId = match?.[1] ?? null;
        expect(applicationId).toBeTruthy();
        if (!applicationId) {
          throw new Error(`Failed to read application id from url: ${url}`);
        }
        await uiAddAPIKeyCredential(page);
      });

      await test.step('subscribe product', async () => {
        const subscriptionsTab = page.getByRole('tab', {
          name: 'Subscriptions',
        });
        await expect(subscriptionsTab).toBeVisible({ timeout: 15000 });
        await subscriptionsTab.click();
        await uiSubscribeProductProduct(page, {
          productName,
        });
      });

      await test.step('usage filter logic', async () => {
        const appId = applicationId;
        let defaultKeyAuthId: string | null = null;

        await page.route('**/api/**/applications/api_calls', async (route) => {
          const postData = route.request().postData();
          if (postData) {
            const payload = JSON.parse(postData);
            expect(payload.start_at).toBe(dayjs().startOf('day').unix());
            expect(payload.end_at).toBe(dayjs().endOf('day').unix());
            expect(payload.application_id).toBe(applicationId);
          }
          await route.continue();
        });

        await page.route('**/api/**/credentials**', async (route) => {
          const res = await route.fetch();
          const data = await res.json();
          const credentialList = data.data || data.list || [];
          const matched = credentialList.find(
            (item: { name: string }) => item.name === 'default-key-auth',
          );
          if (matched?.id) {
            defaultKeyAuthId = matched.id;
          }
          await route.fulfill({ response: res, json: data });
        });

        await page.getByRole('tab', { name: 'Usage' }).click();

        // check default start date and end date
        await expect(page.getByPlaceholder('Start date')).toHaveValue(
          dayjs().startOf('day').format('YYYY-MM-DD HH:mm:ss'),
        );
        await expect(page.getByPlaceholder('End date')).toHaveValue(
          dayjs().endOf('day').format('YYYY-MM-DD HH:mm:ss'),
        );

        await page.getByTestId('application-usage-filter-product').click();
        await page.getByText('gateway-product-').click();

        const credentialSelect = page.getByTestId(
          'application-usage-filter-credential',
        );
        await credentialSelect.click();
        const credentialInput = credentialSelect.locator('input');
        await credentialInput.fill('default-key-auth');
        await credentialInput.press('Enter');
      });
    });
  },
);
