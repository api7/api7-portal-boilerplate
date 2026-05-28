import { expect, request } from '@playwright/test';

import { KEYCLOAK_K8S_URL, KEYCLOAK_URL } from '../constant';
import { test } from '../fixture';
import { a7GetDCRProviderList } from '../req/dashboard/auth';
import { a7PostGateway } from '../req/dashboard/gateway';
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
import { a7UICreateDCR } from '../utils/a7UI';
import { getAccessToken } from '../utils/helper';
import { kcAdmin } from '../utils/keycloak';
import {
  k8DeployA7Gateway,
  k8HelmUninstall,
  k8PortForward,
} from '../utils/shell';
import { uiGoToAPICredentials, uiSubscribeProductInAPIHub } from '../utils/ui';

test.describe('Test Gateway Product with DCR', { tag: ['@gateway'] }, () => {
  let gatewayId: string;
  let serviceId: string;
  let clientId: string;
  let clientSecret: string;
  let routeId: string;
  let productId: string;
  let initialAccessToken: string;
  let validToken: string;
  let dcrProviderId: string;
  const seed = (+Date.now()).toString();
  const serviceName = `product-service-${seed}`;
  const productName = `gateway-product-${seed}`;
  const gatewayName = `gateway-product-${seed}`;
  const dcrProviderName = `dcr-provider-${seed}`;
  const keycloakInitialAccessTokenAddress = `${KEYCLOAK_K8S_URL}/admin/master/console/#/master/clients/initial-access-token`;
  const keycloakTokenURL = `${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`;
  const keycloakIssuer = `${KEYCLOAK_K8S_URL}/realms/master`;
  const gatewayAddress = `http://localhost:9080`;
  const portalHost = 'httpbin.portal.org';
  const routePathPrefix = `/${seed}/anything`;

  const expectGatewayStatus = async (token: string, expectedStatus: number) => {
    const api = await request.newContext();

    try {
      await expect
        .poll(
          async () => {
            const res = await api.get(`${gatewayAddress}${routePathPrefix}`, {
              headers: {
                Host: portalHost,
                Authorization: `Bearer ${token}`,
              },
            });

            return res.status();
          },
          {
            timeout: 120_000,
            intervals: [1000, 2000, 5000],
          },
        )
        .toBe(expectedStatus);
    } finally {
      await api.dispose();
    }
  };

  test.beforeAll(async ({ a7Ctx }) => {
    test.setTimeout(600_000);
    // ensure uninstall
    await k8HelmUninstall();

    // Step 1: Create gateway group
    const res = await a7PostGateway(a7Ctx, {
      name: gatewayName,
    });
    gatewayId = res.value.id;

    // Step 2: Deploy gateway and wait for it to be ready (sequential)
    await k8DeployA7Gateway(a7Ctx, { gateway_group_id: gatewayId });
    await k8PortForward('svc/api7-ee-3-gateway-gateway', '9080:80');

    // Step 3: Create service and route
    const serviceRes = await a7PostPublishedService(a7Ctx, gatewayId, {
      name: serviceName,
      hosts: ['httpbin.internal.org', portalHost],
      path_prefix: `/${seed}`,
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

    await a7PutServiceOAS(a7Ctx, gatewayId, serviceId, httpbinRawOAS);

    // post route
    const routeRes = await a7PostPublishedRoute(a7Ctx, gatewayId, {
      name: 'test',
      service_id: serviceId,
      paths: ['/anything'],
      labels: {
        'portal:dcr:require_any_scopes': 'phone address',
      },
    });
    routeId = routeRes.value.id;
  });

  test.afterAll(async ({ a7Ctx }) => {
    test.setTimeout(600_000);
    await k8HelmUninstall();
    await a7DeleteProductList(a7Ctx);
    await a7DeletePublishedRoute(a7Ctx, routeId, gatewayId);
    await a7DeleteService(a7Ctx, serviceId, gatewayId);
  });

  test('test gateway product with dcr', async ({ page, a7Ctx, a7UIPage }) => {
    test.setTimeout(600_000);

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

      const dcrProviders = await a7GetDCRProviderList(a7Ctx);
      dcrProviderId =
        dcrProviders.list.find(({ name }) => name === dcrProviderName)?.id ||
        '';
      expect(dcrProviderId).toBeTruthy();
    });

    await test.step('create product with dcr', async () => {
      const productRes = await a7PostGatewayProduct(a7Ctx, {
        name: productName,
        linked_gateway_services: [
          {
            gateway_group_id: gatewayId,
            service_id: serviceId,
          },
        ],
        auth: {
          dcr: {
            dcr_provider_id: dcrProviderId,
          },
        },
      });
      productId = productRes.value.id;
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
      await page.getByTitle(dcrProviderName).click();
      await page.locator('#redirect_uris_0_redirect_url').fill('*');
      await page
        .locator('.ant-drawer-footer')
        .locator('button', { hasText: 'Add' })
        .click();
      await expect(
        page.locator('.ant-alert', { hasText: 'OAuth Client Created' }),
      ).toBeVisible({ timeout: 5000 });

      clientId = await page
        .locator('.ant-space-item', { hasText: 'Client ID' })
        .locator('input')
        .inputValue();

      clientSecret = await page
        .locator('.ant-space-item', { hasText: 'Client Secret' })
        .locator('input')
        .inputValue();
    });

    await test.step('subscribe product in api hub', async () => {
      await uiSubscribeProductInAPIHub(page, {
        applicationName: 'default',
        productId: productId,
      });
    });

    await test.step('get valid scope access token', async () => {
      // tip: u should run https://github.com/api7/api7ee-developer-portal/blob/514257d6a07a5f05ab4d26d790aa2d1f8b7219ed/.github/workflows/test-dev-portal.yml#L109-L110 locally to make sure the url is right
      validToken = await getAccessToken({
        tokenURL: keycloakTokenURL,
        clientID: clientId,
        clientSecret: clientSecret,
        username: kcAdmin.username,
        password: kcAdmin.password,
        scope: 'address',
      });
      expect(validToken).not.toBeNull();

      await expectGatewayStatus(validToken, 200);
    });

    await test.step('get invalid scope access token', async () => {
      const invalidToken = await getAccessToken({
        tokenURL: keycloakTokenURL,
        clientID: clientId,
        clientSecret: clientSecret,
        username: kcAdmin.username,
        password: kcAdmin.password,
        scope: 'email', // invalid scope
      });

      await expectGatewayStatus(invalidToken, 401);
    });

    await test.step('delete oauth client then check token can not access gateway', async () => {
      await uiGoToAPICredentials(page);
      await expect(
        page.getByRole('main').getByText('Authentication Type'),
      ).toBeVisible();
      await expect(page.getByRole('tab', { name: 'OAuth' })).toBeVisible();
      await page.getByRole('tab', { name: 'OAuth' }).click();

      // Open dropdown menu and click Delete
      const oauthRow = page.locator('.ant-table-row', { hasText: clientId });
      const moreMenuBtn = oauthRow.locator('button.ant-dropdown-trigger');
      await moreMenuBtn.click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();

      await page.locator('[id="inputText"]').fill(clientId);
      await page.getByRole('button', { name: 'Confirm' }).click();
      await expect(
        page.locator('.ant-table-cell', { hasText: clientId }),
      ).toBeHidden();

      await expectGatewayStatus(validToken, 401);
    });
  });
});
