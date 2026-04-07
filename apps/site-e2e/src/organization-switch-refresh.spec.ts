import { test } from '../fixture';
import { expect, Page } from '@playwright/test';
import { PATH_ACCOUNT, PATH_APPLICATIONS, PATH_ORGANIZATION, PATH_ROOT } from '@site/constants/path-prefix';
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

const createOrganization = async (page: Page, orgName: string, orgSlug: string) => {
  await getOrgSwitcherBtn(page).click();
  await page.getByRole('menuitem', { name: 'Create Organization' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name' }).fill(orgName);
  await dialog.locator('input[name="slug"]').fill(orgSlug);
  await page.getByRole('button', { name: 'Create Organization' }).click();
  await uiVerifyToast(page, { hasText: 'Organization created' });
};

const switchToOrganization = async (page: Page, orgName: string) => {
  await getOrgSwitcherBtn(page).click();
  const menuItem = getOrgMenuItem(page, orgName);
  await expect(menuItem).toBeVisible();
  await menuItem.click();
};

test.describe('Organization Switch - Data Refresh', () => {
    test.setTimeout(60_000);
  
  test('applications should refresh when switching organizations', async ({
    page,
  }) => {
    const testId = Date.now();
    const org1Name = `OrgA${testId}`;
    const org2Name = `OrgB${testId}`;
    const org1Slug = org1Name.toLowerCase();
    const org2Slug = org2Name.toLowerCase();
    const app1Name = `App-Org1-${testId}`;
    const app2Name = `App-Org2-${testId}`;

    await test.step('Create first organization and add an application', async () => {
      await page.goto(PATH_ROOT);

      await getOrgSwitcherBtn(page).click();
      await page.getByRole('menuitem', { name: 'Create Organization' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox', { name: 'Name' }).fill(org1Name);
      await dialog.locator('input[name="slug"]').fill(org1Slug);
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
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox', { name: 'Name' }).fill(org2Name);
      await dialog.locator('input[name="slug"]').fill(org2Slug);
      await page.getByRole('button', { name: 'Create Organization' }).click();
      await uiVerifyToast(page, { hasText: 'Organization created' });
      await expect(page).toHaveURL(new RegExp(`/${org2Slug}/`));

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
      await expect(page).toHaveURL(
        new RegExp(`/${org1Slug}${PATH_APPLICATIONS}(?:\\?.*)?$`)
      );

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
      await expect(page).toHaveURL(
        new RegExp(`/${org2Slug}${PATH_APPLICATIONS}(?:\\?.*)?$`)
      );

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
    const org1Slug = org1Name.toLowerCase();

    await test.step('Setup: Create two organizations', async () => {
      await page.goto(PATH_ROOT);

      // Create org1
      await page.getByRole('button', { name: 'Organization' }).click();
      await page.getByRole('menuitem', { name: 'Create Organization' }).click();
      let dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox', { name: 'Name' }).fill(org1Name);
      await dialog.locator('input[name="slug"]').fill(org1Name.toLowerCase());
      await page.getByRole('button', { name: 'Create Organization' }).click();
      await uiVerifyToast(page, { hasText: 'Organization created' });

      // Create org2
      await page.getByRole('button', { name: 'Organization' }).click();
      await page.getByRole('menuitem', { name: 'Create Organization' }).click();
      dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox', { name: 'Name' }).fill(org2Name);
      await dialog.locator('input[name="slug"]').fill(org2Name.toLowerCase());
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
      await expect(page).toHaveURL(
        new RegExp(`/${org1Slug}${PATH_APPLICATIONS}(?:\\?.*)?$`)
      );

      // Wait for potential refetch
      await page.waitForTimeout(1000);

      // Verify that applications API was called after switching
      // This confirms queryClient.invalidateQueries() and queryClient.refetchQueries() worked
      expect(apiCalls.length).toBeGreaterThan(0);
    });

    // Skip cleanup - organizations use unique timestamps and won't affect other tests
  });

  test('should add org slug for organization-scoped routes on organization switch', async ({
    page,
  }) => {
    const testId = Date.now();
    const org1Name = `RouteOrgA${testId}`;
    const org2Name = `RouteOrgB${testId}`;
    const org1Slug = org1Name.toLowerCase();
    const org2Slug = org2Name.toLowerCase();

    await page.goto(PATH_ROOT);
    await createOrganization(page, org1Name, org1Slug);
    await createOrganization(page, org2Name, org2Slug);

    await page.goto(PATH_APPLICATIONS);
    await expect(page).toHaveURL(/\/applications(?:\?.*)?$/);

    await switchToOrganization(page, org1Name);
    await expect(page).toHaveURL(new RegExp(`/${org1Slug}/applications(?:\\?.*)?$`));

    await switchToOrganization(page, org2Name);
    await expect(page).toHaveURL(new RegExp(`/${org2Slug}/applications(?:\\?.*)?$`));
  });

  test('should keep non-org routes without slug on organization switch', async ({
    page,
  }) => {
    const testId = Date.now();
    const org1Name = `GlobalRouteOrgA${testId}`;
    const org2Name = `GlobalRouteOrgB${testId}`;
    const org1Slug = org1Name.toLowerCase();
    const org2Slug = org2Name.toLowerCase();

    await page.goto(PATH_ROOT);
    await createOrganization(page, org1Name, org1Slug);
    await createOrganization(page, org2Name, org2Slug);

    const accountOrgsPath = `${PATH_ACCOUNT}/organizations`;
    await page.goto(accountOrgsPath);
    await expect(page).toHaveURL(new RegExp(`${accountOrgsPath}(?:\\?.*)?$`));

    await switchToOrganization(page, org1Name);
    await expect(page).toHaveURL(new RegExp(`${accountOrgsPath}(?:\\?.*)?$`));
    await expect(page).not.toHaveURL(new RegExp(`/${org1Slug}${accountOrgsPath}`));

    await switchToOrganization(page, org2Name);
    await expect(page).toHaveURL(new RegExp(`${accountOrgsPath}(?:\\?.*)?$`));
    await expect(page).not.toHaveURL(new RegExp(`/${org2Slug}${accountOrgsPath}`));
  });
});

test.describe('Organization Settings - Slug-Prefixed Routes', () => {
  test('should load slug-prefixed organization settings page', async ({
    page,
    auth,
  }) => {
    const orgSlug = auth.organization;
    await page.goto(`/${orgSlug}/organization/settings`);
    await expect(page).toHaveURL(
      new RegExp(`/${orgSlug}/organization/settings`)
    );
    // Verify organization settings content is rendered
    await expect(page.getByRole('button', { name: 'Save' }).first()).toBeVisible();
  });

  test('should preserve slug-prefixed organization path when switching orgs', async ({
    page,
  }) => {
    const testId = Date.now();
    const org1Name = `OrgSettingsA${testId}`;
    const org2Name = `OrgSettingsB${testId}`;
    const org1Slug = org1Name.toLowerCase();
    const org2Slug = org2Name.toLowerCase();

    await page.goto(PATH_ROOT);
    await createOrganization(page, org1Name, org1Slug);
    await createOrganization(page, org2Name, org2Slug);

    // Navigate directly to org1's slug-prefixed settings page
    await page.goto(`/${org1Slug}/organization/settings`);
    await expect(page).toHaveURL(
      new RegExp(`/${org1Slug}/organization/settings`)
    );

    // Switch to org2 while on org1's settings page
    await switchToOrganization(page, org2Name);
    // Should land on org2's settings page, not org1's
    await expect(page).toHaveURL(
      new RegExp(`/${org2Slug}/organization/settings`)
    );
  });

  test('should redirect from /organization/* to slug-prefixed route when switching orgs', async ({
    page,
  }) => {
    const testId = Date.now();
    const org1Name = `OrgOldRouteA${testId}`;
    const org2Name = `OrgOldRouteB${testId}`;
    const org1Slug = org1Name.toLowerCase();
    const org2Slug = org2Name.toLowerCase();

    await page.goto(PATH_ROOT);
    await createOrganization(page, org1Name, org1Slug);
    await createOrganization(page, org2Name, org2Slug);

    // Navigate to old (non-slug-prefixed) organization settings
    await page.goto(`${PATH_ORGANIZATION}/settings`);
    await expect(page).toHaveURL(
      new RegExp(`${PATH_ORGANIZATION}/settings(?:\\?.*)?$`)
    );

    // Switch to org1 — should now redirect to the slug-prefixed URL
    await switchToOrganization(page, org1Name);
    await expect(page).toHaveURL(
      new RegExp(`/${org1Slug}/organization/settings`)
    );
  });

  test('should update URL when org slug is renamed in settings', async ({
    page,
  }) => {
    const testId = Date.now();
    const orgName = `OrgRename${testId}`;
    const orgSlug = orgName.toLowerCase();
    const newSlug = `${orgSlug}r`;

    await page.goto(PATH_ROOT);
    await createOrganization(page, orgName, orgSlug);

    // Navigate to slug-prefixed settings page
    await page.goto(`/${orgSlug}/organization/settings`);
    await expect(page).toHaveURL(
      new RegExp(`/${orgSlug}/organization/settings`)
    );

    // Update the org slug via the settings form
    const slugInput = page.locator('input[name="slug"]');
    await slugInput.fill(newSlug);
    await page
      .locator('form', { has: slugInput })
      .getByRole('button', { name: 'Save' })
      .click();
    await uiVerifyToast(page, { hasText: /updated/i });

    // URL should automatically update without a manual refresh
    await expect(page).toHaveURL(
      new RegExp(`/${newSlug}/organization/settings`)
    );

    // Refreshing should not 404 — the new slug URL should still work
    await page.reload();
    await expect(page).toHaveURL(
      new RegExp(`/${newSlug}/organization/settings`)
    );
    await expect(page.getByRole('button', { name: 'Save' }).first()).toBeVisible();
  });
});
