import { expect, request } from '@playwright/test';
import { API_PRODUCTS, API_SUBSCRIPTIONS } from '@site/constants/api-prefix';
import { PATH_API_HUB, PATH_LOGIN } from '@site/constants/path-prefix';
import type { ProductListRes } from '@site/types/portal-sdk';

import { E2E_TARGET_URL, HTTPBIN_URL } from '../../constant';
import { test } from '../../fixture';
import { a7PostGateway } from '../../req/dashboard/gateway';
import {
  a7DeleteProductList,
  httpbinRawOAS,
} from '../../req/dashboard/product';
import {
  a7DeletePublishedRoute,
  a7PostPublishedRoute,
} from '../../req/dashboard/route';
import {
  a7DeleteService,
  a7PostPublishedService,
  a7PutServiceOAS,
} from '../../req/dashboard/service';
import {
  a7UIChangeProductVisibility,
  a7UICreateGatewayProduct,
} from '../../utils/a7UI';
import { randomId } from '../../utils/helper';
import {
  deployGatewayContainer,
  removeGatewayContainer,
  waitForGatewayPort,
} from '../../utils/shell';
import {
  uiAPIHubSearchProduct,
  uiAddAPIKeyCredential,
  uiGetCredentialKeyAuth,
  uiShowLogin,
  uiSubscribeProductInAPIHub,
} from '../../utils/ui';

// Reset storage state for this file to avoid being authenticated
test.use({ storageState: { cookies: [], origins: [] } });

test.describe(
  'guest visit external, gateway products behavior',
  {
    tag: ['@user-story', '@gateway'],
  },
  async () => {
    test.describe.configure({ timeout: 120_000 });
    test.setTimeout(120_000);

    const gatewayProduct = 'guest-gateway-product',
      gateway = randomId(`${gatewayProduct}-gateway`),
      service = randomId(`${gatewayProduct}-service`),
      server = 'http://localhost:9080/';

    let gatewayProductId: string,
      gatewayId: string,
      serviceId: string,
      routeId: string;
    test.beforeAll(async ({ a7UIPage, a7Ctx }) => {
      test.setTimeout(120_000);
      // clear env
      await a7DeleteProductList(a7Ctx);
      await removeGatewayContainer();

      // Step 1: Create gateway group
      const res = await a7PostGateway(a7Ctx, {
        name: gateway,
      });
      gatewayId = res.value.id;

      // Step 2: Deploy gateway and wait for it to be ready (sequential)
      await deployGatewayContainer(a7Ctx, { gateway_group_id: gatewayId });
      await waitForGatewayPort('svc/api7-ee-3-gateway-gateway', '9080:80');

      // Step 3: Create service, route
      const serviceRes = await a7PostPublishedService(a7Ctx, gatewayId, {
        name: service,
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
      console.log('service and route created');

      // Warm up gateway route to avoid transient 502 right after deployment.
      const probeCtx = await request.newContext({
        ignoreHTTPSErrors: true,
      });
      await expect
        .poll(
          async () => {
            try {
              const res = await probeCtx.get(`${server}get`, {
                failOnStatusCode: false,
              });
              return res.status();
            } catch {
              return 0;
            }
          },
          {
            timeout: 30000,
          },
        )
        .toBe(200);
      await probeCtx.dispose();

      // Step 4: Create gateway product with visibility logged_in
      const createdGatewayProductId = await a7UICreateGatewayProduct(
        a7UIPage,
        gatewayProduct,
        gateway,
        service,
        'logged_in',
        false,
        a7Ctx,
      );
      if (!createdGatewayProductId) {
        throw new Error('Failed to create gateway product id');
      }
      gatewayProductId = createdGatewayProductId;
      // others status will be change in test, so we don't need to create them
      // create gateway product with visibility public, can_view_unsubscribed=true
      // create gateway product with visibility public, can_view_unsubscribed=false
    });

    test.afterAll(async ({ a7Ctx }) => {
      test.setTimeout(30_000);
      await removeGatewayContainer();
      await a7DeleteProductList(a7Ctx, [gatewayProductId]);
      await a7DeletePublishedRoute(a7Ctx, routeId, gatewayId);
      await a7DeleteService(a7Ctx, serviceId, gatewayId);
    });

    test('cannot see the gateway product, which is visibility=logged_in', async ({
      page,
    }) => {
      test.slow();
      const productName = gatewayProduct;
      const productId = gatewayProductId;
      // cannot see product list
      await uiAPIHubSearchProduct(page, productName);
      await page.route(`**${API_PRODUCTS}?page=1**`, async (route) => {
        const res = await route.fetch();
        const data = (await res.json()) as ProductListRes;
        expect(data.total).toBe(0);
      });
      await expect(page.getByText(productName)).toBeHidden();

      // cannot see product detail — redirected to login
      await page.goto(`${PATH_API_HUB}/${productId}`);
      await page.waitForURL(new RegExp(`.*${PATH_LOGIN}.*`));
      await uiShowLogin(page);
    });

    test('can see the gateway product, which is visibility=public,can_view_unsubscribed=false', async ({
      page,
      a7UIPage,
      a7Ctx,
    }) => {
      // reuse the same product, change visibility to public
      await a7UIChangeProductVisibility(
        a7UIPage,
        gatewayProductId,
        'public',
        false,
        a7Ctx,
      );
      // can see in product list
      const productName = gatewayProduct;
      await uiAPIHubSearchProduct(page, gatewayProduct);
      await page.route(`**${API_PRODUCTS}?page=1**`, async (route) => {
        const res = await route.fetch();
        const data = (await res.json()) as ProductListRes;
        expect(data.total).toBe(1);
        const info = data.list[0];
        expect(info.name).toBe(productName);
      });

      //  in product detail, can see meta, but cannot see api doc
      const link = page.getByRole('link', { name: productName }).first();
      await link.click();

      const title = page.getByTestId('meta-name').getByText(productName);
      await expect(title).toBeVisible();
      const getOperationLink = page
        .locator('.scalar-app')
        .getByRole('button', { name: /\/get\b.*\bGET\b/i })
        .first();
      await expect(getOperationLink).toBeVisible({ timeout: 15000 });
      // detail page render well
      await expect(page.getByRole('button', { name: 'View ID' })).toBeVisible();
      await expect(getOperationLink).toBeVisible();

      // Test Request to be hidden
      const testRequestBtn = page.getByRole('button', { name: 'Test Request' });
      await expect(testRequestBtn).toBeHidden();
      // Login Then Subscribe To Unlock should be visible
      await expect(
        page.getByRole('button', { name: 'Login Then Subscribe To Unlock' }),
      ).toBeVisible();
    });

    test('should not make subscription API requests when not logged in', async ({
      page,
      a7UIPage,
      a7Ctx,
    }) => {
      // Ensure visibility is public so guest can access
      await a7UIChangeProductVisibility(
        a7UIPage,
        gatewayProductId,
        'public',
        false,
        a7Ctx,
      );

      // Track subscription API requests
      const subscriptionRequests: string[] = [];
      await page.route(`**${API_SUBSCRIPTIONS}**`, async (route) => {
        subscriptionRequests.push(route.request().url());
        await route.continue();
      });

      // Visit product detail page as guest
      await page.goto(`${PATH_API_HUB}/${gatewayProductId}`);
      await page.waitForSelector('.scalar-app', { state: 'attached' });

      // Verify no subscription requests were made
      expect(subscriptionRequests).toHaveLength(0);
    });

    test('can see the gateway product, which is visibility=public,can_view_unsubscribed=true', async ({
      page,
      a7UIPage,
      browser,
      workerStorageState,
      a7Ctx,
    }) => {
      test.setTimeout(60_000);
      // reuse the same product, change visibility to public
      await a7UIChangeProductVisibility(
        a7UIPage,
        gatewayProductId,
        'public',
        true,
        a7Ctx,
      );
      // can see in product list
      const productName = gatewayProduct;
      await uiAPIHubSearchProduct(page, gatewayProduct);
      await page.route(`**${API_PRODUCTS}?page=1**`, async (route) => {
        const res = await route.fetch();
        const data = (await res.json()) as ProductListRes;
        expect(data.total).toBe(1);
        const info = data.list[0];
        expect(info.name).toBe(productName);
      });

      const link = page.getByRole('link', { name: productName }).first();
      await link.click();
      const getOperationLink = page
        .locator('.scalar-app')
        .getByRole('button', { name: /\/get\b.*\bGET\b/i })
        .first();
      await expect(getOperationLink).toBeVisible({ timeout: 15000 });

      await test.step('in product detail, can see meta and doc', async () => {
        // meta
        const title = page.getByTestId('meta-name').getByText(productName);
        await expect(title).toBeVisible();
        // doc
        await expect(page.getByRole('button', { name: 'View ID' })).toBeVisible();
        await expect(getOperationLink).toBeVisible();
      });

      await test.step('cannot send test request without auth', async () => {
        await getOperationLink.click();
        // click Test Request directly should failed
        await page
          .getByRole('button', { name: 'Test Request' })
          .first()
          .click();
        const sendBtn = page.getByRole('button', {
          name: 'Send get request to http://',
        });
        await expect(sendBtn).toBeVisible();
        await sendBtn.click();
        // failed to fetch request should show failed message
        await expect(page.getByText('Authorization Failed')).toBeVisible();
        // close modal
        await page.getByRole('button', { name: 'Close Client' }).click();
      });

      await test.step('can send test request with auth', async () => {
        // use a tmp new page to get an auth token
        const tmpCtx = await browser.newContext({
          baseURL: E2E_TARGET_URL,
          storageState: workerStorageState,
        });
        const tmpPage = await tmpCtx.newPage();
        await uiSubscribeProductInAPIHub(tmpPage, {
          applicationName: 'default',
          productId: gatewayProductId,
        });
        await uiAddAPIKeyCredential(tmpPage);
        const keyAuth = await uiGetCredentialKeyAuth(tmpPage);
        expect(keyAuth).toBeTruthy();
        await tmpCtx.close();

        // open playground
        await getOperationLink.click();
        await page
          .getByRole('button', { name: 'Test Request' })
          .first()
          .click();
        // fill the auth info and click Test Request
        await page
          .getByLabel('API Client')
          .getByPlaceholder('QUxMIFlPVVIgQkFTRSBBUkUgQkVMT05HIFRPIFVT')
          .fill(keyAuth);
        const sendBtn = page.getByRole('button', {
          name: 'Send get request to http://',
        });
        await expect(sendBtn).toBeVisible();
        let got200 = false;
        let lastStatus: number | null = null;
        let lastUrl = '';
        for (let attempt = 1; attempt <= 6; attempt++) {
          // Attach response listener before click to avoid missing fast responses.
          const response = await Promise.all([
            page
              .waitForResponse(
                (res) =>
                  res.request().method() === 'GET' &&
                  res.url().includes('/get'),
                { timeout: 15000 },
              )
              .catch(() => null),
            sendBtn.click(),
          ]).then(([res]) => res);

          if (response) {
            lastStatus = response.status();
            lastUrl = response.url();
          }

          if (lastStatus === 200) {
            got200 = true;
            break;
          }

          await page.waitForTimeout(3000);
        }

        expect(
          got200,
          `expected /get 200 after retries, lastStatus=${lastStatus}, lastUrl=${lastUrl || 'n/a'}`,
        ).toBeTruthy();

        // check response status and successful result rendering
        await expect(page.getByText('Authorization Failed')).toBeHidden();
        await expect(
          page.getByRole('region', { name: /Status:\s*200/ }).first(),
        ).toBeVisible();
      });
    });
  },
);
