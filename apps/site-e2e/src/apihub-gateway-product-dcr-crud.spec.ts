import { expect } from '@playwright/test';

import { test } from '../fixture';
import { a7DeleteDCRProviderList } from '../req/dashboard/auth';
import { a7PostGateway } from '../req/dashboard/gateway';
import { a7DeleteProductList, httpbinRawOAS } from '../req/dashboard/product';
import {
  a7DeletePublishedRoute,
  a7PostPublishedRoute,
} from '../req/dashboard/route';
import {
  a7DeleteService,
  a7PostPublishedService,
  a7PutServiceOAS,
} from '../req/dashboard/service';
import { a7UICreateDCR, a7UICreateGatewayProduct } from '../utils/a7UI';
import { kcAdmin } from '../utils/keycloak';
import {
  uiGetOAuthAlert,
  uiGetOAuthAlertInput,
  uiGoToAPICredentials,
} from '../utils/ui';

test.describe('Test Gateway Product with DCR table coverage', () => {
  let gatewayId: string;
  let serviceId: string;
  let routeId: string;
  let initialAccessToken: string;
  const seed = (+Date.now()).toString();
  const serviceName = `product-service-${seed}`;
  const productName = `gateway-product-${seed}`;
  const gatewayName = `gateway-${seed}`;
  const keycloakBaseURL = 'http://api7ee3-keycloak:8080';
  const dcrProviderName = `dcr-provider-${seed}`;
  const keycloakInitialAccessTokenAddress = `${keycloakBaseURL}/admin/master/console/#/master/clients/initial-access-token`;
  const keycloakIssuer = `${keycloakBaseURL}/realms/master`;
  const portalHost = 'httpbin.portal.org';

  test.beforeAll(async ({ a7Ctx }) => {
    test.setTimeout(300_000);
    await a7DeleteProductList(a7Ctx);

    const res = await a7PostGateway(a7Ctx, {
      name: gatewayName,
    });
    gatewayId = res.value.id;

    await Promise.all([
      a7PostPublishedService(a7Ctx, gatewayId, {
        name: serviceName,
        hosts: ['httpbin.internal.org', portalHost],
        path_prefix: `/${seed}`,
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
      }).then(async (res) => {
        serviceId = res.value.id;
        await a7PutServiceOAS(a7Ctx, gatewayId, serviceId, httpbinRawOAS);
        const routeRes = await a7PostPublishedRoute(a7Ctx, gatewayId, {
          name: 'test',
          service_id: serviceId,
          paths: ['/anything'],
          labels: {
            'portal:dcr:require_any_scopes': 'phone address',
          },
        });
        routeId = routeRes.value.id;
      }),
    ]);
  });

  test.afterAll(async ({ a7Ctx }) => {
    test.setTimeout(600_000);
    await a7DeletePublishedRoute(a7Ctx, routeId, gatewayId);
    await a7DeleteService(a7Ctx, serviceId, gatewayId);
  });

  test.afterEach(async ({ a7Ctx }) => {
    await a7DeleteProductList(a7Ctx);
    await a7DeleteDCRProviderList(a7Ctx);
  });

  test('test search oauth client', async ({ page, a7Ctx, a7UIPage }) => {
    test.setTimeout(50_000);

    await test.step('create keycloak client initial access token', async () => {
      await page.goto(keycloakInitialAccessTokenAddress);
      await page.getByLabel('Email').click();
      await page.getByLabel('Email').fill(kcAdmin.username);
      await page.getByLabel('Password').fill(kcAdmin.password);
      await page.getByRole('button', { name: 'Sign In' }).click();
      const createBtn = page
        .getByRole('button', { name: 'Create' })
        .or(page.getByRole('link', { name: 'Create' }));
      await createBtn.click();
      await page.getByTestId('expiration').fill('10');
      await page.getByTestId('count').getByLabel('Count').fill('100');
      await page.getByTestId('save').click();
      initialAccessToken = await page
        .locator('[aria-label="Copyable input"]')
        .inputValue();
      expect(initialAccessToken).not.toBeNull();
    });

    await test.step('create dcr provider', async () => {
      await a7UICreateDCR(a7UIPage, {
        name: dcrProviderName,
        description: 'dcr desc',
        issuer: keycloakIssuer,
        auth_headers_key: 'Authorization',
        auth_headers_value: `Bearer ${initialAccessToken}`,
      });
    });

    await test.step('create product with dcr', async () => {
      await a7UICreateGatewayProduct(
        a7UIPage,
        productName,
        gatewayName,
        serviceName,
        'public',
        false,
        a7Ctx,
        'dcr',
        dcrProviderName,
        portalHost,
      );
    });

    await test.step('go to application page to create oauth client', async () => {
      await uiGoToAPICredentials(page);
      await expect(
        page.getByRole('main').getByText('Authentication Type'),
      ).toBeVisible();
      await expect(page.getByRole('tab', { name: 'OAuth' })).toBeVisible();
      await page.getByRole('tab', { name: 'OAuth' }).click();

      await page.getByRole('button', { name: 'Add OAuth Client' }).click();
      await page.getByLabel('Identity Provider').click();
      await page.getByRole('option', { name: dcrProviderName }).click();
      await page.locator('#redirect_uris_0_redirect_url').fill('*');
      await page.locator('#desc').fill('test desc 1');
      await page
        .getByTestId('drawer-footer')
        .locator('button', { hasText: 'Add' })
        .click();
      await expect(uiGetOAuthAlert(page, 'OAuth Client Created')).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByRole('heading', { name: 'Add OAuth Client' })).toBeHidden({ timeout: 3000 });

      const clientId1 = await uiGetOAuthAlertInput(
        page,
        'Client ID',
      ).inputValue();

      await page.getByRole('button', { name: 'Add OAuth Client' }).click();
      await page.getByLabel('Identity Provider').click();
      await page
        .getByRole('option', { name: dcrProviderName })
        .click();
      await page.locator('#redirect_uris_0_redirect_url').fill('*');
      await page.locator('#desc').fill('test desc 2');
      await page
        .getByTestId('drawer-footer')
        .locator('button', { hasText: 'Add' })
        .click();
      await expect(uiGetOAuthAlert(page, 'OAuth Client Created')).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByRole('heading', { name: 'Add OAuth Client' })).toBeHidden({ timeout: 3000 });

      const clientId2 = await uiGetOAuthAlertInput(
        page,
        'Client ID',
      ).inputValue();

      await page
        .locator('[placeholder="Search Description"]')
        .fill('test desc');
      await page.locator('[placeholder="Search Description"]').press('Enter');
      await expect(
        page.locator('td', { hasText: clientId1 }),
      ).toBeVisible();
      await expect(
        page.locator('td', { hasText: clientId2 }),
      ).toBeVisible();

      await page
        .locator('[placeholder="Search Description"]')
        .fill('test desc 1');
      await page.locator('[placeholder="Search Description"]').press('Enter');
      await expect(
        page.locator('td', { hasText: clientId1 }),
      ).toBeVisible();
      await expect(
        page.locator('td', { hasText: clientId2 }),
      ).toBeHidden();

      await page
        .locator('[placeholder="Search Description"]')
        .fill('test desc 2');
      await page.locator('[placeholder="Search Description"]').press('Enter');
      await expect(
        page.locator('td', { hasText: clientId2 }),
      ).toBeVisible();
      await expect(
        page.locator('td', { hasText: clientId1 }),
      ).toBeHidden();

      await page
        .locator('[placeholder="Search Description"]')
        .fill('non-existent');
      await page.locator('[placeholder="Search Description"]').press('Enter');
      await expect(
        page.locator('td', { hasText: clientId1 }),
      ).toBeHidden();
      await expect(
        page.locator('td', { hasText: clientId2 }),
      ).toBeHidden();
    });
  });
});
