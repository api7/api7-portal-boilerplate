import { expect } from '@playwright/test';
import { API_PRODUCTS } from '@site/constants/api-prefix';
import { PATH_API_HUB } from '@site/constants/path-prefix';
import type { ProductGateway, ProductListRes } from '@site/types/portal-sdk';

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
  deployGatewayContainer,
  removeGatewayContainer,
  waitForGatewayPort,
} from '../utils/shell';
import {
  uiAddAPIKeyCredential,
  uiGetCredentialKeyAuth,
  uiSubscribeProductInAPIHub,
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
      test.setTimeout(120_000);
      // ensure uninstall
      await removeGatewayContainer();

      // Step 1: Create gateway group
      const res = await a7PostGateway(a7Ctx, {
        name: `gateway-product-${seed}`,
      });
      gatewayId = res.value.id;

      // Step 2: Deploy gateway and wait for it to be ready (sequential)
      await deployGatewayContainer(a7Ctx, { gateway_group_id: gatewayId });
      await waitForGatewayPort('svc/api7-ee-3-gateway-gateway', '9080:80');

      // Step 3: Create service, route, and product
      const serviceRes = await a7PostPublishedService(a7Ctx, gatewayId, {
        name: serviceName,
        plugins: { cors: { allow_origins: '*' } },
        upstream: {
          name: 'default',
          scheme: 'http',
          type: 'roundrobin',
          nodes: [
            {
              host: 'httpbin',
              port: 8080,
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
      test.setTimeout(30_000);
      await removeGatewayContainer();
      await a7DeleteProduct(a7Ctx, productId);
      await a7DeletePublishedRoute(a7Ctx, routeId, gatewayId);
      await a7DeleteService(a7Ctx, serviceId, gatewayId);
    });

    test('api hub list and detail with gateway product', async ({ page }) => {
      test.setTimeout(60_000);
      await uiAddAPIKeyCredential(page);
      // The key is view-once, so capture it now to authenticate the test request
      // later (it is no longer auto-filled in the API client).
      const keyAuth = await uiGetCredentialKeyAuth(page);
      expect(keyAuth).toBeTruthy();
      await page.goto(PATH_API_HUB);
      const search = page.getByRole('textbox', { name: 'Search' });

      await test.step('Search not exist api', async () => {
        // search to get a not exist api
        await search.click();
        await search.fill('not_exist_api');
        await search.press('Enter');
        await expect(page.getByText('No Data')).toBeVisible();
      });

      await test.step('Search exist api', async () => {
        // search to get a exist api
        await search.click();
        await search.clear();
        await search.fill(product.name);
        await search.press('Enter');

        await page.route(`**${API_PRODUCTS}?page=1**`, async (route, req) => {
          const res = await route.fetch();
          const data = (await res.json()) as ProductListRes;
          // should only one product
          expect(data.total).toBe(1);

          const link = page.getByRole('link', { name: product.name }).first();
          await expect(link).toBeVisible();
          await expect(page.getByText('No Data')).toBeHidden();
          await expect(page.getByText('API Count')).toBeVisible();
          await expect(page.getByText(String(3))).toBeVisible();
          await expect(page.getByText(product.desc)).toBeVisible();
          await expect(page.getByText(product.labels.test)).toBeVisible();
        });
      });

      await test.step('Check exist api detail page', async () => {
        const link = page.getByRole('link', { name: product.name }).first();
        await link.click();

        const title = page.getByTestId('meta-name').getByText(product.name);
        await expect(title).toBeVisible();
        const getOperationLink = page
          .locator('.scalar-app')
          .getByRole('button', { name: /\/get\b.*\bGET\b/i })
          .first();
        await expect(getOperationLink).toBeVisible({ timeout: 15000 });
        // detail page render well
        await expect(page.getByRole('button', { name: 'View ID' })).toBeVisible();
        await expect(getOperationLink).toBeVisible();
        await getOperationLink.click();
        await expect(
          page
            .locator('li')
            .filter({ hasText: 'get response' })
            .getByRole('paragraph'),
        ).toBeVisible();

        // subscribe the product first, then we can test request (else it will get cors)
        await uiSubscribeProductInAPIHub(page, {
          applicationName: 'default',
          productId: productId,
        });
        // back to openapi specification tab
        await page
          .getByRole('tab')
          .filter({ hasText: 'OpenAPI Specification' })
          .click();
        // click Test Request
        await page
          .getByRole('button', { name: 'Test Request' })
          .first()
          .click();
        // the key is no longer auto-filled (view-once) — enter it manually
        await page
          .getByLabel('API Client')
          .getByPlaceholder('QUxMIFlPVVIgQkFTRSBBUkUgQkVMT05HIFRPIFVT')
          .fill(keyAuth);
        const sendBtn = page.getByRole('button', {
          name: 'Send get request to http://',
        });
        await expect(sendBtn).toBeVisible();
        await Promise.all([
          page.waitForResponse(
            (res) => res.url().includes(`${server}get`) && res.status() === 200,
            { timeout: 30_000 },
          ),
          sendBtn.click(),
        ]);

        // check response status code
        await expect(page.getByRole('link', { name: '200 OK' })).toBeVisible();
      });

      // set back timeout, to reduce the waiting time for failure
      test.setTimeout(30_000); // Increase timeout for debugging
      await test.step('test request modal should trim paste text', async () => {
        const testText = '   test space    ';
        await page
          .getByLabel('Cookies')
          .getByRole('textbox')
          .filter({ hasText: 'Key' })
          .fill(testText);
        const cookieInput = page
          .getByLabel('Cookies')
          .getByRole('textbox')
          .filter({ hasText: 'test space' })
          .first();

        await cookieInput.press('ControlOrMeta+a');
        await cookieInput.press('ControlOrMeta+c');
        await cookieInput.press('ControlOrMeta+v');
        // Using Exact Match
        await expect(cookieInput).toHaveText(
          new RegExp(`^${testText.trim()}$`),
        );

        // close modal
        await page.getByRole('button', { name: 'Close Client' }).click();
        // wait, and detail page should be visible
        await expect(
          page
            .locator('li')
            .filter({ hasText: 'get response' })
            .getByRole('paragraph'),
        ).toBeVisible();
      });
    });
  },
);
