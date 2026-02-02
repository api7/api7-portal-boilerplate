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
  uiLogin,
  uiLogout,
  uiSubscribeProductApplication,
  uiSubscribeProductInAPIHub,
} from '../utils/ui';
import { a7UIChangeProductVisibility } from '../utils/a7UI';

test.describe('Filter API Hub and Subscribe Product to View', () => {
  let serviceId: string;
  let routeId: string;
  let productId: string;
  let serviceId2: string;
  let routeId2: string;
  let productId2: string;
  const gatewayGroupId = 'default';
  const seed = (+Date.now()).toString();
  const serviceName = `product-service-${seed}`;
  const serviceName2 = `product-service2-${seed}`;
  const product: DeepPartial<ProductGateway> = {
    name: `Wait Approval-${seed}`,
    labels: { test: `test${seed}` },
    desc: `desc${seed}`,
    subscription_auto_approval: false,
    can_view_unsubscribed: false,
  };
  const product2: DeepPartial<ProductGateway> = {
    name: `Demo-${seed}`,
    labels: { test: `test${seed}` },
    desc: `desc${seed}`,
    subscription_auto_approval: true,
    can_view_unsubscribed: true,
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
      a7PostPublishedService(a7Ctx, gatewayGroupId, {
        name: serviceName2,
        upstream: {
          name: 'default',
          scheme: 'http',
          type: 'roundrobin',
          nodes: [
            {
              host: '127.0.0.1',
              port: 2345,
              weight: 100,
            },
          ],
        },
      }).then(async (res) => {
        serviceId2 = res.value.id;
        // post route
        const routeRes = await a7PostPublishedRoute(a7Ctx, gatewayGroupId, {
          name: 'test',
          service_id: serviceId2,
          paths: ['/get'],
        });
        routeId2 = routeRes.value.id;
        // put openapi
        await a7PutServiceOAS(a7Ctx, gatewayGroupId, serviceId2, httpbinRawOAS);
        // post product
        const productRes = await a7PostGatewayProduct(a7Ctx, {
          ...product2,
          linked_gateway_services: [
            {
              gateway_group_id: gatewayGroupId,
              service_id: serviceId2,
            },
          ],
          auth: { 'key-auth': {} },
        });
        productId2 = productRes.value.id;
      }),
    ]);
  });

  test.afterAll(async ({ a7Ctx }) => {
    await a7DeleteProductList(a7Ctx);
    await a7DeletePublishedRoute(a7Ctx, routeId, gatewayGroupId);
    await a7DeleteService(a7Ctx, serviceId, gatewayGroupId);
    await a7DeletePublishedRoute(a7Ctx, routeId2, gatewayGroupId);
    await a7DeleteService(a7Ctx, serviceId2, gatewayGroupId);
  });

  test('can naviagte to application detail page in subscribe product modal', async ({
    page,
    context,
  }) => {
    const application = 'default';
    await page.goto(`${PATH_API_HUB}/detail?id=${productId}`);
    await page.getByRole('tab', { name: 'Subscriptions' }).click();
    const subscribeBtn = page.getByRole('button', {
      name: 'Subscribe to Application',
    });
    await expect(subscribeBtn).toBeVisible();
    await subscribeBtn.click();
    const dialog = page.getByRole('dialog', {
      name: 'Subscribe Application to API Product',
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText('Search and select applications')
    ).toBeVisible();
    await page.waitForTimeout(500);
    const searchEl = dialog.locator('.ant-select');
    // cause this is a div
    await searchEl.click({ force: true });
    await page.waitForTimeout(500);
    const option = page.getByTestId(`option-${application}`);
    await expect(option).toBeVisible();
    const navigateToApplication = page.getByTestId(
      `navigate-to-application-${application}`
    );
    await expect(navigateToApplication).toBeVisible();
    // Need to listen simultaneously to make sure nothing is missed.
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      navigateToApplication.click(),
    ]);
    await newPage.waitForLoadState();
    await expect(newPage.getByText(application)).toBeVisible();
    await expect(newPage.getByText('Subscribe to New API Product')).toBeVisible();
    await expect(newPage.getByText('Authentication Type')).toBeVisible();
  });

  test('subscription to the can view detail product and auto approval product', async ({
    a7UIPage,
    page,
    auth,
    a7Ctx,
  }) => {
    test.slow();
    await page.goto(PATH_API_HUB);
    const link = page.getByRole('link', { name: product.name }).first();
    const link2 = page.getByRole('link', { name: product2.name }).first();
    // test auto approval and can view unsubscribed product status
    await page.getByRole('link', { name: product2.name }).click();
    await uiSubscribeProductInAPIHub(page, {
      applicationName: 'default',
      productId: productId2,
    });

    // Small wait for auto-approval to process on backend
    await page.waitForTimeout(2000);

    // Navigate to API Hub
    await page.goto(PATH_API_HUB);
    await page
      .getByRole('main')
      .getByRole('complementary')
      .getByText('Subscribed')
      .click();

    const productLink = page.getByRole('link', { name: product2.name }).first();
    await expect(productLink).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('No Data')).toBeHidden();
    await page
      .getByRole('main')
      .getByRole('complementary')
      .getByText('All')
      .click();
    await expect(link).toBeVisible();
    await expect(link2).toBeVisible();

    // test non auto approval and not see the detail playground product status
    await page.getByRole('link', { name: 'API Hub' }).click();
    await page.waitForURL(new RegExp(`.*${PATH_API_HUB}(?!.*/detail)`));
    await page.getByRole('link', { name: product.name }).click();

    const BlurPlaneButton = page.getByRole('button', {
      name: 'Subscribe To Unlock',
    });
    await expect(BlurPlaneButton).toBeVisible();
    await BlurPlaneButton.click();
    await uiSubscribeProductApplication(page, { applicationName: 'default' });
    // after subscribe, the button should be hidden
    await expect(BlurPlaneButton).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Waiting For Approval' })
    ).toBeVisible();

    // test filter product
    await test.step('Filter product by status', async () => {
      await page.goto(PATH_API_HUB);
      await expect(link).toBeVisible();
      await expect(link2).toBeVisible();
      await page
        .getByRole('main')
        .getByRole('complementary')
        .getByText('Subscribed')
        .click();
      await expect(link2).toBeVisible();
      await expect(link).toBeHidden();

      await page
        .getByRole('main')
        .getByRole('complementary')
        .getByText('Wait For Approval')
        .click();
      await expect(link2).toBeHidden();
      await expect(link).toBeVisible();

      await page
        .getByRole('main')
        .getByRole('complementary')
        .getByText('All')
        .click();
      await expect(link2).toBeVisible();
      await expect(link).toBeVisible();
    });

    const waitApprovalProduct = page
      .getByRole('link', { name: product.name })
      .first();
    await test.step('After approval or Reject product then to check the detail', async () => {
      // go to provider console to reject the product
      await a7UIPage.goto('/approvals?tab=pending');
      await expect(
        a7UIPage.locator('[id="__next"]').getByText('Approvals')
      ).toBeVisible();
      await expect(
        a7UIPage.getByRole('cell', { name: 'API Product Subscription' }).first()
      ).toBeVisible();
      await expect(
        a7UIPage.getByRole('cell', { name: product.name })
      ).toBeVisible();
      await a7UIPage.getByRole('button', { name: 'Reject' }).first().click();

      // developer can re subscribe the product
      await page.goto(PATH_API_HUB);
      await page.reload();
      await expect(waitApprovalProduct).toBeVisible();
      await waitApprovalProduct.click();
      await expect(BlurPlaneButton).toBeVisible();
      await page.getByRole('button', { name: 'Subscribe To Unlock' }).click();
      await uiSubscribeProductApplication(page, { applicationName: 'default' });
    });

    await test.step('Approval product and check the detail', async () => {
      await a7UIPage.goto('/approvals?tab=pending');
      await expect(
        a7UIPage.locator('[id="__next"]').getByText('Approvals')
      ).toBeVisible();
      await expect(
        a7UIPage.getByRole('cell', { name: 'API Product Subscription' }).first()
      ).toBeVisible();
      await expect(
        a7UIPage.getByRole('cell', { name: product.name })
      ).toBeVisible();
      await a7UIPage.getByRole('button', { name: 'Accept' }).first().click();

      // developer can see the detail
      await page.goto(PATH_API_HUB);
      await expect(waitApprovalProduct).toBeVisible();
      await waitApprovalProduct.click();
      await expect(BlurPlaneButton).toBeHidden();
      await expect(
        page.getByRole('button', { name: 'Test Request (get /get)' })
      ).toBeVisible();
    });

    await test.step('Log out and log in again to ensure product details are refreshed', async () => {
      /**
       * This origin question requires logout in the product detail page, then click login btn, login again to check if the product details are refreshed.
       *
       * The essence is that the query client does not clean or refresh after the user's login status changes.
       * The current processing method is to clean up the query client directly after the user's login status changes.
       */
      // change product visibility to logged in users only
      await a7UIChangeProductVisibility(a7UIPage, productId, 'public', false, a7Ctx);
      // logout
      await page.goto(`${PATH_API_HUB}/detail?id=${productId}`);
      await uiLogout(page);
      // go to product detail page
      await page.goto(`${PATH_API_HUB}/detail?id=${productId}`);
      // when user is not logged in, the subscribe button should be visible
      const loginThenSubscribe = page.getByRole('button', {
        name: 'Login Then Subscribe To Unlock',
      });
      await expect(loginThenSubscribe).toBeVisible({ timeout: 10000 });
      // login and check if subscribe button is hidden and test request button is visible
      await loginThenSubscribe.click();
      await uiLogin(page, auth);
      await expect(loginThenSubscribe).toBeHidden();
      await expect(
        page.getByRole('button', { name: 'Subscribe To Unlock' })
      ).toBeHidden();
      const testRequestBtn = page.getByRole('button', { name: 'Test Request' }).first();
      await testRequestBtn.scrollIntoViewIfNeeded()
      await testRequestBtn.click();
    });
  });
});
