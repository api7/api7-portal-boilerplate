import { test } from '../fixture';
import { expect } from '@playwright/test';
import { API_PREFIX } from '@site/constants/api-prefix';
import { createApplication } from '../req/common';
import { restartDevPortal } from '../utils/shell';
import { ConfigMapData } from '@site/lib/config/schema';
import {
  getConfigMapYaml,
  patchConfigMapYaml,
  updateConfigMapYaml,
} from '../utils/devportal-config';

// Type for application detail configuration updates
type ApplicationDetailConfig = NonNullable<NonNullable<ConfigMapData['app']>['applicationDetail']>;

test.describe('Test Application Detail Tabs Configuration', () => {
  // Set timeout for the entire test suite (10 minutes)
  test.setTimeout(600_000); // 10 minutes in milliseconds

  let testAppId: string;
  let testOrgSlug: string;
  const testApp = {
    name: `Test App Config ${Date.now()}`,
    desc: 'Test application for tabs configuration testing',
  };

  let defaultConfig: string | null = null;

  async function patchConfigMap(
    updates: Partial<ApplicationDetailConfig>
  ): Promise<void> {
    await patchConfigMapYaml<ConfigMapData>((configObj) => {
      configObj.app ??= {};
      configObj.app.applicationDetail ??= {} as ApplicationDetailConfig;
      configObj.app.applicationDetail.credentialsTabs ??=
        {} as ApplicationDetailConfig['credentialsTabs'];

      if (updates.subscriptions !== undefined) {
        configObj.app.applicationDetail.subscriptions = updates.subscriptions;
      }
      if (updates.usage !== undefined) {
        configObj.app.applicationDetail.usage = updates.usage;
      }
      if (updates.credentialsTabs) {
        Object.assign(configObj.app.applicationDetail.credentialsTabs, updates.credentialsTabs);
      }
    });
  }

  const allCredentialsTabs = { keyAuth: true, basicAuth: true, oauth: true };

  async function updateConfigAndRestart(updates: Partial<ApplicationDetailConfig>) {
    await patchConfigMap(updates);
    await restartDevPortal();
  }

  test.beforeAll(async ({ ctx, auth }) => {
    // Create a test application
    testOrgSlug = auth.organization;
    const app = await createApplication(ctx, testApp, testOrgSlug);
    testAppId = app.id;

    // Backup default config
    defaultConfig = await getConfigMapYaml();
  });

  test.afterAll(async ({ ctx }) => {
    // Clean up test application
    if (testAppId && testOrgSlug) {
      await ctx.delete(`${API_PREFIX}/${testOrgSlug}/applications/${testAppId}`);
    }

    // Restore default config if it was backed up
    if (defaultConfig) {
      await updateConfigMapYaml(defaultConfig);
      await restartDevPortal();
    }
  });

  test('should show all tabs by default', async ({ page }) => {
    await page.goto(`/${testOrgSlug}/applications/${testAppId}`);

    // All main tabs should be visible
    await expect(
      page.getByRole('tab', { name: 'Subscriptions' })
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Authentication Type' })
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Usage' })).toBeVisible();

    // Click on Authentication Type tab
    await page.getByRole('tab', { name: 'Authentication Type' }).click();

    // All credentials sub-tabs should be visible
    await expect(
      page.getByRole('tab', { name: 'Key Authentication' })
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Basic Authentication' })
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: 'OAuth' })).toBeVisible();
  });

  test('should hide subscriptions tab when configured', async ({ page }) => {
    await updateConfigAndRestart({
      subscriptions: false,
      usage: true,
      credentialsTabs: allCredentialsTabs,
    });

    await page.goto(`/${testOrgSlug}/applications/${testAppId}`);
    await expect(page.getByRole('tab', { name: 'Subscriptions' })).not.toBeVisible();
    await expect(page.getByRole('tab', { name: 'Authentication Type' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Usage' })).toBeVisible();
  });

  test('should hide usage tab when configured', async ({ page }) => {
    await updateConfigAndRestart({
      subscriptions: true,
      usage: false,
      credentialsTabs: allCredentialsTabs,
    });

    await page.goto(`/${testOrgSlug}/applications/${testAppId}`);
    await expect(page.getByRole('tab', { name: 'Usage' })).not.toBeVisible();
    await expect(page.getByRole('tab', { name: 'Subscriptions' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Authentication Type' })).toBeVisible();
  });

  test('should hide keyAuth sub-tab when configured', async ({ page }) => {
    await updateConfigAndRestart({
      subscriptions: true,
      usage: true,
      credentialsTabs: { keyAuth: false, basicAuth: true, oauth: true },
    });

    await page.goto(`/${testOrgSlug}/applications/${testAppId}`);
    await page.getByRole('tab', { name: 'Authentication Type' }).click();
    await expect(page.getByRole('tab', { name: 'Key Authentication' })).not.toBeVisible();
    await expect(page.getByRole('tab', { name: 'Basic Authentication' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'OAuth' })).toBeVisible();
  });

  test('should hide basicAuth sub-tab when configured', async ({ page }) => {
    await updateConfigAndRestart({
      subscriptions: true,
      usage: true,
      credentialsTabs: { keyAuth: true, basicAuth: false, oauth: true },
    });

    await page.goto(`/${testOrgSlug}/applications/${testAppId}`);
    await page.getByRole('tab', { name: 'Authentication Type' }).click();
    await expect(page.getByRole('tab', { name: 'Basic Authentication' })).not.toBeVisible();
    await expect(page.getByRole('tab', { name: 'Key Authentication' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'OAuth' })).toBeVisible();
  });

  test('should hide oauth sub-tab when configured', async ({ page }) => {
    await updateConfigAndRestart({
      subscriptions: true,
      usage: true,
      credentialsTabs: { keyAuth: true, basicAuth: true, oauth: false },
    });

    await page.goto(`/${testOrgSlug}/applications/${testAppId}`);
    await page.getByRole('tab', { name: 'Authentication Type' }).click();
    await expect(page.getByRole('tab', { name: 'OAuth' })).not.toBeVisible();
    await expect(page.getByRole('tab', { name: 'Key Authentication' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Basic Authentication' })).toBeVisible();
  });

  test('should auto-hide credentials tab when all sub-tabs are disabled', async ({
    page,
  }) => {
    // Update ConfigMap using patch
    await patchConfigMap({
      subscriptions: true,
      usage: true,
      credentialsTabs: {
        keyAuth: false,
        basicAuth: false,
        oauth: false,
      },
    });
    await restartDevPortal();

    await page.goto(`/${testOrgSlug}/applications/${testAppId}`);

    // Authentication Type tab should not be visible when all sub-tabs are disabled
    await expect(
      page.getByRole('tab', { name: 'Authentication Type' })
    ).not.toBeVisible();

    // Other tabs should still be visible
    await expect(
      page.getByRole('tab', { name: 'Subscriptions' })
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Usage' })).toBeVisible();
  });

  test('should show credentials tab when at least one sub-tab is enabled', async ({
    page,
  }) => {
    // Update ConfigMap using patch
    await patchConfigMap({
      subscriptions: true,
      usage: true,
      credentialsTabs: {
        keyAuth: true,
        basicAuth: false,
        oauth: false,
      },
    });
    await restartDevPortal();

    await page.goto(`/${testOrgSlug}/applications/${testAppId}`);

    // Authentication Type tab should be visible when at least one sub-tab is enabled
    await expect(
      page.getByRole('tab', { name: 'Authentication Type' })
    ).toBeVisible();

    // Click on Authentication Type tab
    await page.getByRole('tab', { name: 'Authentication Type' }).click();

    // Only the enabled sub-tab content should be visible.
    // When only one credential type is enabled, the switcher is hidden;
    // verify by checking the Add button for the enabled type.
    await expect(
      page.getByRole('button', { name: 'Add Key Authentication Credential' })
    ).toBeVisible();

    // Disabled sub-tab switcher buttons should not be present
    await expect(
      page.getByRole('tab', { name: 'Basic Authentication' })
    ).not.toBeVisible();
    await expect(page.getByRole('tab', { name: 'OAuth' })).not.toBeVisible();
  });

  test('should handle multiple tabs hidden configuration', async ({ page }) => {
    // Update ConfigMap using patch
    await patchConfigMap({
      subscriptions: false,
      usage: false,
      credentialsTabs: {
        keyAuth: false,
        basicAuth: true,
        oauth: false,
      },
    });
    await restartDevPortal();

    await page.goto(`/${testOrgSlug}/applications/${testAppId}`);

    // Hidden tabs should not be visible
    await expect(
      page.getByRole('tab', { name: 'Subscriptions' })
    ).not.toBeVisible();
    await expect(page.getByRole('tab', { name: 'Usage' })).not.toBeVisible();

    // Only credentials tab should be visible (because basicAuth is enabled)
    await expect(
      page.getByRole('tab', { name: 'Authentication Type' })
    ).toBeVisible();

    // Click on Authentication Type tab
    await page.getByRole('tab', { name: 'Authentication Type' }).click();

    // Only the enabled sub-tab content should be visible.
    // When only one credential type is enabled, the switcher is hidden;
    // verify by checking the Add button for the enabled type.
    await expect(
      page.getByRole('button', { name: 'Add Basic Authentication Credential' })
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Key Authentication' })
    ).not.toBeVisible();
    await expect(page.getByRole('tab', { name: 'OAuth' })).not.toBeVisible();
  });

});
