import { test } from '../fixture';
import { expect } from '@playwright/test';
import {
  uiAddApplication,
  uiDeleteApplicationInList,
  uiVerifyToast,
  uiGoToApplications,
  uiSubscribeProductProduct,
} from '../utils/ui';
import {
  a7DeleteProductList,
  a7PostGatewayProduct,
  a7PostExternalProduct,
  httpbinRawOAS,
} from '../req/dashboard/product';
import {
  a7DeleteService,
  a7PostPublishedService,
  a7PutServiceOAS,
} from '../req/dashboard/service';
import {
  a7DeletePublishedRoute,
  a7PostPublishedRoute,
} from '../req/dashboard/route';
import type { ProductGateway } from '@site/types/portal-sdk';

test.describe('Test Application Subscriptions', () => {
  const gatewayGroupId = 'default';
  const baseSeed = Date.now();

  // Test products with different approval settings
  const autoApprovalProduct: DeepPartial<ProductGateway> = {
    name: `Auto Approval Product ${baseSeed}`,
    labels: { test: `auto${baseSeed}` },
    desc: 'Product with auto approval enabled',
    subscription_auto_approval: true,
    can_view_unsubscribed: true,
  };

  const manualApprovalProduct: DeepPartial<ProductGateway> = {
    name: `Manual Approval Product ${baseSeed}`,
    labels: { test: `manual${baseSeed}` },
    desc: 'Product requiring manual approval',
    subscription_auto_approval: false,
    can_view_unsubscribed: false,
  };

  let serviceId: string;
  let serviceId2: string;
  let routeId: string;
  let routeId2: string;
  let autoApprovalProductId: string;
  let manualApprovalProductId: string;
  let externalProductId: string;

  test.beforeAll(async ({ a7Ctx }) => {
    // Create services and products for testing
    // Each gateway product needs its own service (a service can only be linked to one product)
    const service = await a7PostPublishedService(a7Ctx, gatewayGroupId, {
      name: `subscription-test-service-${baseSeed}`,
      upstream: {
        name: 'default',
        scheme: 'http',
        type: 'roundrobin',
        nodes: [{ host: '127.0.0.1', port: 1234, weight: 100 }],
      },
    });
    serviceId = service.value.id;

    const service2 = await a7PostPublishedService(a7Ctx, gatewayGroupId, {
      name: `subscription-test-service2-${baseSeed}`,
      upstream: {
        name: 'default',
        scheme: 'http',
        type: 'roundrobin',
        nodes: [{ host: '127.0.0.1', port: 1234, weight: 100 }],
      },
    });
    serviceId2 = service2.value.id;

    // Create routes
    const route = await a7PostPublishedRoute(a7Ctx, gatewayGroupId, {
      name: `test-route-${baseSeed}`,
      service_id: serviceId,
      paths: ['/test'],
    });
    routeId = route.value.id;

    const route2 = await a7PostPublishedRoute(a7Ctx, gatewayGroupId, {
      name: `test-route2-${baseSeed}`,
      service_id: serviceId2,
      paths: ['/test2'],
    });
    routeId2 = route2.value.id;

    // Add OpenAPI specs
    await a7PutServiceOAS(a7Ctx, gatewayGroupId, serviceId, httpbinRawOAS);
    await a7PutServiceOAS(a7Ctx, gatewayGroupId, serviceId2, httpbinRawOAS);

    // Create auto approval product
    const autoProduct = await a7PostGatewayProduct(a7Ctx, {
      ...autoApprovalProduct,
      linked_gateway_services: [
        {
          gateway_group_id: gatewayGroupId,
          service_id: serviceId,
        },
      ],
      auth: { 'key-auth': {} },
    });
    autoApprovalProductId = autoProduct.value.id;

    // Create manual approval product (uses its own service)
    const manualProduct = await a7PostGatewayProduct(a7Ctx, {
      ...manualApprovalProduct,
      linked_gateway_services: [
        {
          gateway_group_id: gatewayGroupId,
          service_id: serviceId2,
        },
      ],
      auth: { 'key-auth': {} },
    });
    manualApprovalProductId = manualProduct.value.id;

    // Create external product
    const externalProduct = await a7PostExternalProduct(a7Ctx);
    externalProductId = externalProduct.value.id;
  });

  test.afterAll(async ({ a7Ctx }) => {
    await a7DeleteProductList(a7Ctx, [
      autoApprovalProductId,
      manualApprovalProductId,
      externalProductId,
    ]);
    await a7DeletePublishedRoute(a7Ctx, routeId, gatewayGroupId);
    await a7DeletePublishedRoute(a7Ctx, routeId2, gatewayGroupId);
    await a7DeleteService(a7Ctx, serviceId, gatewayGroupId);
    await a7DeleteService(a7Ctx, serviceId2, gatewayGroupId);
  });

  test.beforeEach(async ({ page }) => {
    await uiGoToApplications(page);
    const noData = page.getByRole('cell', { name: 'No Data' });
    const firstMoreBtn = page.getByTestId('more').first();
    await expect(noData.or(firstMoreBtn)).toBeVisible();
    // Keep deleting first row until table is empty
    while (await firstMoreBtn.isVisible()) {
      const firstDataRow = page.getByRole('row').nth(1);
      const nameCell = firstDataRow.getByRole('cell').first();
      const name = await nameCell.textContent();
      await uiDeleteApplicationInList(page, name);
    }
  });

  test('can navigate to application subscriptions tab', async ({ page }) => {
    const testSeed = Date.now();
    const testApp = {
      name: `Test App ${testSeed}`,
      desc: 'Test application for subscription testing',
      label: { key: 'env', value: 'test' },
    };

    await test.step('create test application', async () => {
      await uiAddApplication(page, testApp);
    });

    await test.step('navigate to application detail', async () => {
      const nameCell = page.getByRole('cell', { name: testApp.name });
      const nameLink = nameCell.getByRole('link', { name: testApp.name });
      await nameLink.click();
      await expect(page).toHaveURL(/\/applications\/detail\?id=.+$/);
    });

    await test.step('verify subscriptions tab exists and is accessible', async () => {
      await expect(
        page.getByRole('tab', { name: 'Subscriptions' })
      ).toBeVisible();
      await page.getByRole('tab', { name: 'Subscriptions' }).click();

      // Verify subscription table is visible
      const subscriptionTable = page.getByTestId('application-subscriptions');
      await expect(subscriptionTable).toBeVisible();

      // Verify subscribe button is visible
      await expect(
        page.getByRole('button', { name: 'Subscribe to New API Product' })
      ).toBeVisible();

      // Verify search placeholder
      await expect(page.getByPlaceholder('Search API product')).toBeVisible();
    });
  });

  test('can subscribe to API products with auto approval', async ({ page }) => {
    const testSeed = Date.now();
    const testApp = {
      name: `Test App ${testSeed}`,
      desc: 'Test application for subscription testing',
      label: { key: 'env', value: 'test' },
    };

    await test.step('create test application', async () => {
      await uiAddApplication(page, testApp);
    });

    await test.step('navigate to subscriptions tab', async () => {
      await page.getByText(testApp.name).click();
      await page.getByRole('tab', { name: 'Subscriptions' }).click();
    });

    await test.step('subscribe to auto approval product', async () => {
      await uiSubscribeProductProduct(page, {
        productName: autoApprovalProduct.name,
      });
    });

    await test.step('verify subscription appears in table', async () => {
      // Wait for table to update
      await page.waitForTimeout(1000);

      const productNameCell = page.getByRole('cell', {
        name: autoApprovalProduct.name,
      });
      await expect(productNameCell).toBeVisible();

      // Check status is 'Subscribed'
      const statusCell = page
        .locator('tr')
        .filter({ has: productNameCell })
        .getByText('Subscribed');
      await expect(statusCell).toBeVisible();
    });

    await test.step('verify product link navigation', async () => {
      const productLink = page
        .getByRole('cell', { name: autoApprovalProduct.name })
        .getByRole('link', { name: autoApprovalProduct.name });

      // Capture new tab
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        productLink.click(),
      ]);

      // Verify navigation to API Hub product detail
      await expect(newPage).toHaveURL(/\/api-hub\/detail\?id=.+$/);
      await newPage.close();
    });
  });

  test('can unsubscribe from API products', async ({ page }) => {
    const testSeed = Date.now();
    const testApp = {
      name: `Test App ${testSeed}`,
      desc: 'Test application for subscription testing',
      label: { key: 'env', value: 'test' },
    };

    await test.step('create test application and subscribe to product', async () => {
      await uiAddApplication(page, testApp);
      const nameCell = page.getByRole('cell', { name: testApp.name });
      const nameLink = nameCell.getByRole('link', { name: testApp.name });
      await nameLink.click();
      await page.getByRole('tab', { name: 'Subscriptions' }).click();

      await uiSubscribeProductProduct(page, {
        productName: autoApprovalProduct.name,
      });
    });

    await test.step('unsubscribe from product', async () => {
      const productRow = page
        .getByRole('cell', { name: autoApprovalProduct.name })
        .locator('xpath=..');

      // Click actions menu
      const moreMenuBtn = productRow.getByTestId('more');
      await moreMenuBtn.click();

      // Click unsubscribe
      const unsubscribeBtn = page.getByRole('menuitem', {
        name: 'Unsubscribe',
      });
      await unsubscribeBtn.click();

      // Verify unsubscribe modal
      const unsubscribeModal = page.getByRole('dialog', {
        name: 'Unsubscribe API Product',
      });
      await expect(unsubscribeModal).toBeVisible();

      // Check warning message
      await expect(
        page.getByText(
          'After unsubscribing, you will no longer be able to access'
        )
      ).toBeVisible();

      // Fill confirmation input
      const confirmInput = page.getByPlaceholder(autoApprovalProduct.name);
      await confirmInput.fill(autoApprovalProduct.name);

      // Confirm unsubscribe
      const confirmBtn = page.getByRole('button', { name: 'Confirm' });
      await expect(confirmBtn).toBeEnabled();
      await confirmBtn.click();

      await uiVerifyToast(page, {
        hasText: 'Unsubscribe API Product Successfully',
      });
    });

    await test.step('verify subscription is removed from table', async () => {
      const productNameCell = page.getByRole('cell', {
        name: autoApprovalProduct.name,
      });
      await expect(productNameCell).not.toBeAttached();
    });
  });

  test('can search subscriptions', async ({ page }) => {
    const testSeed = Date.now();
    const testApp = {
      name: `Test App ${testSeed}`,
      desc: 'Test application for subscription testing',
      label: { key: 'env', value: 'test' },
    } as const;

    await test.step('create test application and subscribe to multiple products', async () => {
      await uiGoToApplications(page);
      await uiAddApplication(page, testApp);
      await page.getByText(testApp.name).click();
      await page.getByRole('tab', { name: 'Subscriptions' }).click();

      await uiSubscribeProductProduct(page, {
        productName: autoApprovalProduct.name,
      });
    });

    await test.step('test search functionality', async () => {
      await uiGoToApplications(page);
      await page.getByText(testApp.name).click();

      const searchInput = page.getByPlaceholder('Search API product');

      // Search for auto approval product
      await searchInput.fill(autoApprovalProduct.name);
      await searchInput.press('Enter');

      await expect(
        page.getByRole('cell', { name: autoApprovalProduct.name })
      ).toBeVisible();

      // Clear search
      await searchInput.clear();
      await searchInput.press('Enter');

      // search for non-existent product
      await searchInput.fill('non-existent');
      await searchInput.press('Enter');
      await expect(
        page.getByRole('cell', { name: autoApprovalProduct.name })
      ).toBeHidden();
    });
  });
});
