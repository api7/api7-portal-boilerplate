import { test as baseTest, expect } from '@playwright/test';
import { PATH_LOGIN } from '@site/constants/path-prefix';
import { kcAdmin, kcDeleteClients, newKCAdminClient } from '../utils/keycloak';
import { KEYCLOAK_CONTAINER_URL, KEYCLOAK_URL } from '../constant';

// Use unauthenticated storage state for OIDC tests
const test = baseTest.extend({});
test.use({ storageState: { cookies: [], origins: [] } });

// Keycloak OIDC configuration (must match auth/server.ts)
const oidcClientId = 'devportal-oidc';
const oidcClientSecret = 'devportal-oidc-secret';

test.describe('OIDC Authentication', () => {
  test.beforeAll(async () => {
    test.setTimeout(600_000);

    // Create OIDC client in Keycloak
    console.log('Creating OIDC client in Keycloak...');
    const kcAdminClient = await newKCAdminClient({
      baseUrl: KEYCLOAK_URL,
      realmName: 'master',
    });

    await kcAdminClient.auth({
      ...kcAdmin,
      grantType: 'password',
      clientId: 'admin-cli',
    });

    // Delete existing OIDC client if any (kcDeleteClients targets the 'api7' client;
    // also explicitly delete devportal-oidc to avoid "already exists" on retries).
    await kcDeleteClients(kcAdminClient);
    const existingOidcClients = await kcAdminClient.clients.find({ clientId: oidcClientId });
    await Promise.allSettled(
      (existingOidcClients ?? []).map((c) => kcAdminClient.clients.del({ id: c.id! }))
    );

    // Create new OIDC client for dev portal
    await kcAdminClient.clients.create({
      clientId: oidcClientId,
      secret: oidcClientSecret,
      enabled: true,
      protocol: 'openid-connect',
      publicClient: false,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: true,
      redirectUris: ['*'],
      webOrigins: ['*'],
    });

    console.log('OIDC client created in Keycloak');
  });

  test.afterAll(async () => {
    // Cleanup: delete OIDC client from Keycloak
    console.log('Deleting OIDC client from Keycloak...');
    const kcAdminClient = await newKCAdminClient({
      baseUrl: KEYCLOAK_URL,
      realmName: 'master',
    });

    await kcAdminClient.auth({
      ...kcAdmin,
      grantType: 'password',
      clientId: 'admin-cli',
    });

    await kcDeleteClients(kcAdminClient);
    console.log('OIDC client deleted from Keycloak');
  });

  test('can sign in with OIDC (Keycloak)', async ({ page }) => {
    test.setTimeout(90_000);
    await test.step('navigate to login page', async () => {
      await page.goto(PATH_LOGIN);
      await expect(page.getByText('Sign In', { exact: true }).first()).toBeVisible();
    });

    await test.step('click keycloak sign in button', async () => {
      // The social provider button should be visible
      const keycloakBtn = page.getByRole('button', {
        name: /keycloak/i,
      });
      await expect(keycloakBtn).toBeVisible({ timeout: 10000 });
      await keycloakBtn.click();
    });

    await test.step('login via Keycloak', async () => {
      // Should be redirected to Keycloak login page
      await expect(page).toHaveURL(
        new RegExp(
          `${KEYCLOAK_CONTAINER_URL}/realms/master/protocol/openid-connect/auth.*`
        ),
        { timeout: 10000 }
      );

      // Fill in Keycloak credentials
      await page.fill('#username', kcAdmin.username);
      await page.fill('#password', kcAdmin.password);
      await page.click('#kc-login');
    });

    await test.step('verify successful authentication', async () => {
      // After Keycloak login, user should be redirected back and logged in
      await page.waitForURL((url) => !url.hostname.includes('keycloak'), {
        timeout: 30000,
      });

      // Verify user is authenticated - Account button should be visible
      await expect(page.getByRole('button', { name: 'Account' })).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test('keycloak sign in button is visible on login page', async ({ page }) => {
    await page.goto(PATH_LOGIN);

    // Keycloak social provider button should be visible
    const keycloakBtn = page.getByRole('button', {
      name: /keycloak/i,
    });
    await expect(keycloakBtn).toBeVisible({ timeout: 10000 });
  });

  test('handles OIDC callback error gracefully', async ({ page }) => {
    // Try to access callback with invalid state
    await page.goto(
      `${PATH_LOGIN}?error=access_denied&error_description=User+cancelled+login`
    );

    // Should show login page (not crash)
    await expect(page.getByText('Sign In', { exact: true }).first()).toBeVisible();
  });
});
