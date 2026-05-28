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
import { uiGoToAPICredentials, uiVerifyToast } from '../utils/ui';

test.describe('Test Gateway Product with DCR', () => {
  let gatewayId: string;
  let serviceId: string;
  let routeId: string;
  let initialAccessToken: string;
  let clientId: string;
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

  test('test gateway product with dcr crud', async ({
    page,
    a7Ctx,
    a7UIPage,
  }) => {
    test.slow();

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
      await page.getByTitle(dcrProviderName).click();
      await page.locator('#redirect_uris_0_redirect_url').fill('*');
      await page.locator('#desc').fill('test desc');
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
    });

    await test.step('edit oauth client', async () => {
      await page.getByRole('button', { name: 'Edit' }).click();
      // should be disabled
      await expect(page.getByLabel('Identity Provider')).toBeDisabled();
      // check form fields are correct
      await expect(page.locator('#redirect_uris_0_redirect_url')).toHaveValue(
        '*',
      );
      await expect(page.locator('#desc')).toHaveValue('test desc');

      // update redirect uri and desc
      await page
        .locator('#redirect_uris_0_redirect_url')
        .fill('localhost:3000');
      await page.locator('#desc').fill('test desc 2');
      await page
        .locator('.ant-drawer-footer')
        .locator('button', { hasText: 'Save' })
        .click();

      // check update data save correctly
      await page.getByRole('button', { name: 'Edit' }).click();
      await expect(page.locator('#redirect_uris_0_redirect_url')).toHaveValue(
        'localhost:3000',
      );
      await expect(page.locator('#desc')).toHaveValue('test desc 2');
    });

    await test.step('verify regenerate secret hidden for OIDC provider', async () => {
      // Navigate fresh to OAuth tab (edit step may leave drawer open)
      await uiGoToAPICredentials(page);
      await expect(page.getByRole('tab', { name: 'OAuth' })).toBeVisible();
      await page.getByRole('tab', { name: 'OAuth' }).click();

      // The current DCR provider is OIDC, so Regenerate Secret should not be rendered
      const oauthRow = page.locator('.ant-table-row', { hasText: clientId });
      const moreMenuBtn = oauthRow.locator('button.ant-dropdown-trigger');
      await moreMenuBtn.click();
      const regenerateItem = page.getByRole('menuitem', {
        name: 'Regenerate Secret',
      });
      await expect(regenerateItem).toBeHidden();
      // Close the dropdown by pressing Escape
      await page.keyboard.press('Escape');
    });

    await test.step('regenerate oauth client secret (mocked http_bridge)', async () => {
      const mockClientSecret = 'mock-regenerated-secret-12345';

      // Mock credential list API to return provider_type: 'http_bridge'
      // so the Regenerate Secret button becomes enabled
      const credentialsRouteMatcher = /\/api\/[^/]+\/credentials(?:\?.*)?$/;
      await page.route(credentialsRouteMatcher, async (route) => {
        const response = await route.fetch();
        const body = await response.json();
        body.list = body.list?.map((item: Record<string, unknown>) => {
          if (
            item.type === 'oauth' &&
            (item.oauth as Record<string, unknown>)?.dcr_provider
          ) {
            const oauth = item.oauth as Record<string, unknown>;
            oauth.dcr_provider = {
              ...(oauth.dcr_provider as Record<string, unknown>),
              provider_type: 'http_bridge',
            };
          }
          return item;
        });
        await route.fulfill({ response, json: body });
      });

      // Mock regenerate API to return a fully mocked response with client_secret
      // The real backend does not support regenerate for OAuth credentials,
      // so we intercept and return a synthetic success response.
      await page.route('**/credentials/*/regenerate', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          json: {
            id: 'mock-credential-id',
            type: 'oauth',
            oauth: {
              dcr_provider_id: 'mock-provider-id',
              client_id: clientId,
              client_secret: mockClientSecret,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
      });

      // Navigate to the OAuth tab to load mocked data
      await uiGoToAPICredentials(page);
      await expect(page.getByRole('tab', { name: 'OAuth' })).toBeVisible();
      await page.getByRole('tab', { name: 'OAuth' }).click();

      // Open the dropdown menu and click Regenerate Secret
      const oauthRow = page.locator('.ant-table-row', { hasText: clientId });
      const moreMenuBtn = oauthRow.locator('button.ant-dropdown-trigger');
      await moreMenuBtn.click();
      const regenerateBtn = page.getByRole('menuitem', {
        name: 'Regenerate Secret',
      });
      await expect(regenerateBtn).toBeVisible();
      // Should NOT be disabled since we mocked provider_type to http_bridge
      await expect(regenerateBtn).not.toHaveAttribute('aria-disabled', 'true');
      await regenerateBtn.click();

      // Verify modal title
      const modalTitle = page.getByText('Regenerate OAuth Client Secret', {
        exact: true,
      });
      await expect(modalTitle).toBeVisible();

      // Verify alert message in modal
      const alertMessage = page.getByText(
        'After regeneration, a new Client Secret',
      );
      await expect(alertMessage).toBeVisible();

      // Confirm button should be disabled before fill
      const confirmBtn = page.getByRole('button', { name: 'Confirm' });
      await expect(confirmBtn).toBeDisabled();

      // Fill client_id as confirmation text
      const confirmInput = page.getByPlaceholder(clientId);
      await confirmInput.fill(clientId);

      // Confirm button should now be enabled
      await expect(confirmBtn).toBeEnabled();
      await confirmBtn.click();

      // Verify success toast
      await uiVerifyToast(page, {
        hasText: 'Regenerate OAuth Client Secret Successfully',
      });

      // Modal should close
      await expect(modalTitle).toBeHidden();

      // Verify OAuthAlert shows with regeneration-specific text
      await expect(
        page.locator('.ant-alert', {
          hasText: 'OAuth Client Secret Regenerated',
        }),
      ).toBeVisible({ timeout: 5000 });

      // Verify Client ID field is visible in alert
      await expect(
        page
          .locator('.ant-space-item', { hasText: 'Client ID' })
          .locator('input'),
      ).toBeVisible();
      // Verify Client Secret field is visible and has the mocked value
      const secretInput = page
        .locator('.ant-space-item', { hasText: 'Client Secret' })
        .locator('input');
      await expect(secretInput).toBeVisible();
      await expect(secretInput).toHaveValue(mockClientSecret);

      // Clean up route mocks
      await page.unroute(credentialsRouteMatcher);
      await page.unroute('**/credentials/*/regenerate');
    });

    await test.step('delete oauth client', async () => {
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
    });
  });

  test('test gateway product with wrong dcr provider issuer', async ({
    page,
    a7Ctx,
    a7UIPage,
  }) => {
    test.setTimeout(50_000);
    const invalidDcrProviderName = `invalid-dcr-provider-${seed}`;

    await test.step('create dcr provider with wrong issuer', async () => {
      await a7UICreateDCR(a7UIPage, {
        name: invalidDcrProviderName,
        description: 'dcr desc',
        issuer: 'http://api7ee3-keycloak:8080/invalidIssuer',
        auth_headers_key: 'Authorization',
        auth_headers_value: `Bearer wrong-token`,
      });
    });

    await test.step('create product with wrong dcr provider', async () => {
      await a7UICreateGatewayProduct(
        a7UIPage,
        productName,
        gatewayName,
        serviceName,
        'public',
        false,
        a7Ctx,
        'dcr',
        invalidDcrProviderName,
        portalHost,
      );
    });

    await test.step('go to application page to create oauth client to show error', async () => {
      await uiGoToAPICredentials(page);
      await expect(
        page.getByRole('main').getByText('Authentication Type'),
      ).toBeVisible();
      await expect(page.getByRole('tab', { name: 'OAuth' })).toBeVisible();
      await page.getByRole('tab', { name: 'OAuth' }).click();

      await page.getByRole('button', { name: 'Add OAuth Client' }).click();
      await page.getByLabel('Identity Provider').click();
      await page.getByTitle(invalidDcrProviderName).click();
      await page.locator('#redirect_uris_0_redirect_url').fill('*');
      await page.locator('#desc').fill('test desc');
      await page
        .locator('.ant-drawer-footer')
        .locator('button', { hasText: 'Add' })
        .click();
      await uiVerifyToast(page, {
        hasText: 'failed',
      });
      await expect(page.locator('.ant-drawer-open')).toBeVisible();
    });
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

      // create first oauth client
      await page.getByRole('button', { name: 'Add OAuth Client' }).click();
      await page.getByLabel('Identity Provider').click();
      await page
        .locator('.ant-select-item-option', { hasText: dcrProviderName })
        .first()
        .click();
      await page.locator('#redirect_uris_0_redirect_url').fill('*');
      await page.locator('#desc').fill('test desc 1');
      await page
        .locator('.ant-drawer-footer')
        .locator('button', { hasText: 'Add' })
        .click();
      await expect(
        page.locator('.ant-alert', { hasText: 'OAuth Client Created' }),
      ).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.ant-drawer-open')).toBeHidden();

      const clientId1 = await page
        .locator('.ant-space-item', { hasText: 'Client ID' })
        .locator('input')
        .inputValue();

      // create second oauth client with different desc
      await page.getByRole('button', { name: 'Add OAuth Client' }).click();
      await page.getByLabel('Identity Provider').click();
      const drawer = page.getByRole('dialog');
      await page
        .locator('.ant-select-item-option', { hasText: dcrProviderName })
        .first()
        .click();
      await drawer.locator('#redirect_uris_0_redirect_url').fill('*');
      await page.locator('#desc').fill('test desc 2');
      await page
        .locator('.ant-drawer-footer')
        .locator('button', { hasText: 'Add' })
        .click();
      await expect(
        page.locator('.ant-alert', { hasText: 'OAuth Client Created' }),
      ).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.ant-drawer-open')).toBeHidden();

      const clientId2 = await page
        .locator('.ant-space-item', { hasText: 'Client ID' })
        .locator('input')
        .inputValue();

      // test search oauth client
      await page
        .locator('[placeholder="Search Description"]')
        .fill('test desc');
      await page.locator('[placeholder="Search Description"]').press('Enter');
      await expect(
        page.locator('.ant-table-cell', { hasText: clientId1 }),
      ).toBeVisible();
      await expect(
        page.locator('.ant-table-cell', { hasText: clientId2 }),
      ).toBeVisible();

      await page
        .locator('[placeholder="Search Description"]')
        .fill('test desc 1');
      await page.locator('[placeholder="Search Description"]').press('Enter');
      await expect(
        page.locator('.ant-table-cell', { hasText: clientId1 }),
      ).toBeVisible();
      await expect(
        page.locator('.ant-table-cell', { hasText: clientId2 }),
      ).toBeHidden();

      await page
        .locator('[placeholder="Search Description"]')
        .fill('test desc 2');
      await page.locator('[placeholder="Search Description"]').press('Enter');
      await expect(
        page.locator('.ant-table-cell', { hasText: clientId2 }),
      ).toBeVisible();
      await expect(
        page.locator('.ant-table-cell', { hasText: clientId1 }),
      ).toBeHidden();

      await page
        .locator('[placeholder="Search Description"]')
        .fill('non-existent');
      await page.locator('[placeholder="Search Description"]').press('Enter');
      await expect(
        page.locator('.ant-table-cell', { hasText: clientId1 }),
      ).toBeHidden();
      await expect(
        page.locator('.ant-table-cell', { hasText: clientId2 }),
      ).toBeHidden();
    });
  });
});
