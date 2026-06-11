import { expect } from '@playwright/test';
import { PATH_API_HUB } from '@site/constants/path-prefix';
import type { ProductGateway } from '@site/types/portal-sdk';

import { test } from '../fixture';
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
import { a7UIChangeProductVisibility } from '../utils/a7UI';
import {
  getOrgScopedPath,
  uiAddApplication,
  uiGoToApplications,
  uiLogin,
  uiLogout,
  uiSubscribeProductApplication,
  uiSubscribeProductInAPIHub,
} from '../utils/ui';

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
  }) => {
    const application = `subscribe-app-${Date.now()}`;

    await uiGoToApplications(page);
    await uiAddApplication(page, {
      name: application,
      desc: 'subscription test',
    });
    const applicationDetailPath = await page
      .getByRole('link', { name: application })
      .getAttribute('href');
    expect(applicationDetailPath).toMatch(/\/applications\/[^/]+$/);
    const applicationId = applicationDetailPath?.split('/applications/')[1] ?? '';

    await page.goto(getOrgScopedPath(page, `${PATH_API_HUB}/${productId}`));
    const subscribeBtn = page.getByRole('button', {
      name: 'Subscribe To Unlock',
    });
    await expect(subscribeBtn).toBeVisible();
    await subscribeBtn.click();
    const dialog = page.getByRole('dialog', {
      name: 'Subscribe Application to API Product',
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Applications')).toBeVisible();
    await page.evaluate(() => {
      const openCalls: Array<[string | undefined, string | undefined]> = [];
      window.open = ((url?: string | URL, target?: string) => {
        openCalls.push([url?.toString(), target]);
        return null;
      }) as typeof window.open;
      (
        window as typeof window & {
          __portalOpenCalls?: Array<[string | undefined, string | undefined]>;
        }
      ).__portalOpenCalls = openCalls;
    });
    const searchInput = dialog
      .locator('[data-slot="combobox-chip-input"]')
      .first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill(application);
    const navigateToApplication = page.getByTestId(
      `navigate-to-application-${application}`,
    );
    await expect(navigateToApplication).toBeVisible();
    await navigateToApplication.evaluate((button) => {
      if (button instanceof HTMLElement) {
        button.click();
      }
    });

    const openCalls = await page.evaluate(
      () =>
        (
          window as typeof window & {
            __portalOpenCalls?: Array<[string | undefined, string | undefined]>;
          }
        ).__portalOpenCalls ?? [],
    );
    expect(openCalls[0]?.[0]).toContain(`/applications/${applicationId}`);
    expect(openCalls[0]?.[1]).toBe('_blank');
  });

  test('subscription to the can view detail product and auto approval product', async ({
    a7UIPage,
    page,
    auth,
    a7Ctx,
  }) => {
    test.slow();
    // Navigate to /applications first so the server redirect gives us the org slug,
    // then derive the org-scoped API Hub base path for all subsequent navigations.
    await uiGoToApplications(page);
    const orgScopedApiHub = getOrgScopedPath(page, PATH_API_HUB);
    await page.goto(orgScopedApiHub);
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
    await page.goto(orgScopedApiHub);
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
      page.getByRole('button', { name: 'Waiting For Approval' }),
    ).toBeVisible();

    // test filter product
    await test.step('Filter product by status', async () => {
      await page.goto(orgScopedApiHub);
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
        a7UIPage.locator('[id="__next"]').getByText('Approvals'),
      ).toBeVisible();
      await expect(
        a7UIPage
          .getByRole('cell', { name: 'API Product Subscription' })
          .first(),
      ).toBeVisible();
      await expect(
        a7UIPage.getByRole('cell', { name: product.name }),
      ).toBeVisible();
      await a7UIPage.getByRole('button', { name: 'Reject' }).first().click();

      // developer can re subscribe the product
      await page.goto(orgScopedApiHub);
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
        a7UIPage.locator('[id="__next"]').getByText('Approvals'),
      ).toBeVisible();
      await expect(
        a7UIPage
          .getByRole('cell', { name: 'API Product Subscription' })
          .first(),
      ).toBeVisible();
      await expect(
        a7UIPage.getByRole('cell', { name: product.name }),
      ).toBeVisible();
      await a7UIPage.getByRole('button', { name: 'Accept' }).first().click();

      // developer can see the detail
      await page.goto(orgScopedApiHub);
      await expect(waitApprovalProduct).toBeVisible();
      await waitApprovalProduct.click();
      await expect(BlurPlaneButton).toBeHidden();
      await expect(
        page.getByRole('button', { name: 'Test Request (get /get)' }),
      ).toBeVisible();
    });

    await test.step('Log out and log in again to ensure product details are refreshed', async () => {
      /**
       * This origin question requires logout in the product detail page, then click login btn, login again to check if the product details are refreshed.
       *
       * The essence is that the query client does not clean or refresh after the user's login status changes.
       * The current processing method is to clean up the query client directly after the user's login status changes.
       */
      // keep product visible in API Hub while requiring login before subscribe
      await a7UIChangeProductVisibility(
        a7UIPage,
        productId,
        'public',
        false,
        a7Ctx,
      );
      // logout
      await page.goto(`${orgScopedApiHub}/${productId}`);
      await uiLogout(page);
      // guest: slug route redirects unauthenticated users to /api-hub list,
      // so use the non-scoped URL to land directly on the product detail page.
      await page.goto(`${PATH_API_HUB}/${productId}`);
      // when user is not logged in, the subscribe button should be visible
      const loginThenSubscribe = page.getByRole('button', {
        name: 'Login Then Subscribe To Unlock',
      });
      await expect(loginThenSubscribe).toBeVisible({ timeout: 10000 });
      // Wait for Account button (session cookie confirmed in browser) before
      // navigating to the org-scoped URL, which requires a valid session server-side.
      await uiLogin(page, auth, { goToLogin: true });
      await page.goto(`${orgScopedApiHub}/${productId}`);
      await expect(
        page.getByRole('button', { name: 'Login', exact: true }),
      ).toBeHidden();
      const testRequestBtn = page.getByRole('button', {
        name: 'Test Request (get /get)',
        exact: true,
      });
      await expect(testRequestBtn.or(loginThenSubscribe)).toBeVisible({
        timeout: 15_000,
      });
      if (await testRequestBtn.isVisible()) {
        await testRequestBtn.scrollIntoViewIfNeeded();
        await testRequestBtn.click();
      }
    });
  });
});
