import { test } from '../fixture';
import { expect, Page } from '@playwright/test';
import { PATH_APPLICATIONS, PATH_ROOT } from '@site/constants/path-prefix';
import { API_APPLICATIONS } from '@site/constants/api-prefix';
import { uiVerifyToast, uiAddApplication } from '../utils/ui';

/**
 * Helper to get organization switcher button
 */
const getOrgSwitcherBtn = (page: Page) => {
  return page.getByRole('button', { name: 'Organization', exact: true });
};

/**
 * Helper to get organization menu item by name (matches "name slug" format)
 */
const getOrgMenuItem = (page: Page, orgName: string) => {
  // Menu item format is "name slug", use regex to match org name at start
  return page.getByRole('menuitem', { name: new RegExp(`^${orgName}\\s`) });
};

test.describe('Organization Switch - Data Refresh', () => {
  test('applications should refresh when switching organizations', async ({
    page,
  }) => {
    const testId = Date.now();
    const org1Name = `OrgA${testId}`;
    const org2Name = `OrgB${testId}`;
    const app1Name = `App-Org1-${testId}`;
    const app2Name = `App-Org2-${testId}`;

    await test.step('Create first organization and add an application', async () => {
      await page.goto(PATH_ROOT);

      await getOrgSwitcherBtn(page).click();
      await page.getByRole('menuitem', { name: 'Create Organization' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill(org1Name);
      await page
        .getByRole('textbox', { name: 'Slug URL' })
        .fill(org1Name.toLowerCase());
      await page.getByRole('button', { name: 'Create Organization' }).click();
      await uiVerifyToast(page, { hasText: 'Organization created' });

      // Add an application in org1
      await page.goto(PATH_APPLICATIONS);
      await uiAddApplication(page, { name: app1Name, desc: 'App for Org 1' });
      await expect(page.getByRole('cell', { name: app1Name })).toBeVisible();
    });

    await test.step('Create second organization and add a different application', async () => {
      await page.goto(PATH_ROOT);

      await getOrgSwitcherBtn(page).click();
      await page.getByRole('menuitem', { name: 'Create Organization' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill(org2Name);
      await page
        .getByRole('textbox', { name: 'Slug URL' })
        .fill(org2Name.toLowerCase());
      await page.getByRole('button', { name: 'Create Organization' }).click();
      await uiVerifyToast(page, { hasText: 'Organization created' });

      // Add a different application in org2
      await page.goto(PATH_APPLICATIONS);
      await uiAddApplication(page, { name: app2Name, desc: 'App for Org 2' });
      await expect(page.getByRole('cell', { name: app2Name })).toBeVisible();
      // Verify app1 is NOT visible (because we're in org2)
      await expect(
        page.getByRole('cell', { name: app1Name })
      ).not.toBeVisible();
    });

    await test.step('Switch back to first organization and verify applications refresh', async () => {
      // Switch back to org1 (staying on applications page)
      await page.getByRole('button', { name: 'Organization' }).click();
      const org1MenuItem = getOrgMenuItem(page, org1Name);
      await expect(org1MenuItem).toBeVisible();
      await org1MenuItem.click();

      // Verify app1 is now visible (org1's app)
      await expect(page.getByRole('cell', { name: app1Name })).toBeVisible();
      // Verify app2 is NOT visible (org2's app should not be here)
      await expect(
        page.getByRole('cell', { name: app2Name })
      ).not.toBeVisible();
    });

    await test.step('Switch to second organization and verify again', async () => {
      // Switch to org2
      await page.getByRole('button', { name: 'Organization' }).click();
      const org2MenuItem = getOrgMenuItem(page, org2Name);
      await expect(org2MenuItem).toBeVisible();
      await org2MenuItem.click();

      // Verify app2 is now visible (org2's app)
      await expect(page.getByRole('cell', { name: app2Name })).toBeVisible();
      // Verify app1 is NOT visible (org1's app should not be here)
      await expect(
        page.getByRole('cell', { name: app1Name })
      ).not.toBeVisible();
    });

    // Skip cleanup - organizations use unique timestamps and won't affect other tests
  });

  test('query cache should be invalidated on organization switch', async ({
    page,
  }) => {
    const testId = Date.now();
    const org1Name = `CacheTestOrg1${testId}`;
    const org2Name = `CacheTestOrg2${testId}`;

    await test.step('Setup: Create two organizations', async () => {
      await page.goto(PATH_ROOT);

      // Create org1
      await page.getByRole('button', { name: 'Organization' }).click();
      await page.getByRole('menuitem', { name: 'Create Organization' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill(org1Name);
      await page
        .getByRole('textbox', { name: 'Slug URL' })
        .fill(org1Name.toLowerCase());
      await page.getByRole('button', { name: 'Create Organization' }).click();
      await uiVerifyToast(page, { hasText: 'Organization created' });

      // Create org2
      await page.getByRole('button', { name: 'Organization' }).click();
      await page.getByRole('menuitem', { name: 'Create Organization' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill(org2Name);
      await page
        .getByRole('textbox', { name: 'Slug URL' })
        .fill(org2Name.toLowerCase());
      await page.getByRole('button', { name: 'Create Organization' }).click();
      await uiVerifyToast(page, { hasText: 'Organization created' });
    });

    await test.step('Navigate to applications page', async () => {
      await page.goto(PATH_APPLICATIONS);
      // Should see the applications table
      await expect(page.getByTestId('application-table')).toBeVisible();
    });

    await test.step('Switch org and verify API calls are made', async () => {
      // Track network requests
      const apiCalls: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes(API_APPLICATIONS)) {
          apiCalls.push(request.url());
        }
      });

      // Switch organization
      await page.getByRole('button', { name: 'Organization' }).click();
      const org1MenuItem = getOrgMenuItem(page, org1Name);
      await expect(org1MenuItem).toBeVisible();
      await org1MenuItem.click();

      // Wait for potential refetch
      await page.waitForTimeout(1000);

      // Verify that applications API was called after switching
      // This confirms queryClient.invalidateQueries() and queryClient.refetchQueries() worked
      expect(apiCalls.length).toBeGreaterThan(0);
    });

    // Skip cleanup - organizations use unique timestamps and won't affect other tests
  });
});
