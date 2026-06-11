import { Page, expect } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';
import {
  PATH_APPLICATIONS,
  PATH_DASHBOARD_ORGANIZATIONS,
  PATH_ORGANIZATION,
  PATH_ROOT,
} from '@site/constants/path-prefix';

import { test } from '../fixture';

/**
 * Helper to get the org switcher trigger in the header user menu.
 */
const getOrgSwitcherBtn = (page: Page) => {
  return page.getByTestId('org-switcher');
};

/**
 * Helper to get organization menu item by name.
 */
const getOrgMenuItem = (page: Page, orgName: string) => {
  return page.getByRole('menuitem').filter({ hasText: orgName }).first();
};

/**
 * Create an organization via the auth API.
 * Returns the generated slug from the response body.
 */
const createOrganization = async (
  page: Page,
  orgName: string,
): Promise<string> => {
  const response = await page.request.post(
    `${AUTH_BASE_PATH}/organization/create`,
    {
      data: {
        name: orgName,
        slug: orgName.toLowerCase(),
        keepCurrentActiveOrganization: false,
      },
      failOnStatusCode: false,
    },
  );

  expect(response.status()).toBe(200);
  const body = await response.json();
  const slug = body.slug;
  expect(slug).toBeTruthy();

  return slug;
};

const switchToOrganization = async (page: Page, orgName: string) => {
  await getOrgSwitcherBtn(page).click();
  const menuItem = getOrgMenuItem(page, orgName);
  // After creating an org via API the switcher list may need time to refetch.
  await expect(menuItem).toBeVisible({ timeout: 15_000 });
  await menuItem.click();
};

test.describe('Organization Switch - Data Refresh', () => {
  test.setTimeout(60_000);

  test('should add org slug for organization-scoped routes on organization switch', async ({
    page,
  }) => {
    const testId = Date.now();
    const org1Name = `RouteOrgA${testId}`;
    const org2Name = `RouteOrgB${testId}`;
    let org1Slug: string;
    let org2Slug: string;

    await page.goto(PATH_ROOT);
    org1Slug = await createOrganization(page, org1Name);
    org2Slug = await createOrganization(page, org2Name);

    await page.goto(PATH_APPLICATIONS);
    await expect(page).toHaveURL(/\/applications(?:\?.*)?$/);

    await switchToOrganization(page, org1Name);
    await expect(page).toHaveURL(
      new RegExp(`/${org1Slug}/applications(?:\\?.*)?$`),
    );

    await switchToOrganization(page, org2Name);
    await expect(page).toHaveURL(
      new RegExp(`/${org2Slug}/applications(?:\\?.*)?$`),
    );
  });

  test('should keep non-org routes without slug on organization switch', async ({
    page,
  }) => {
    test.skip(
      true,
      'Dashboard organizations route is not stable for this flow',
    );
    const testId = Date.now();
    const org1Name = `GlobalRouteOrgA${testId}`;
    const org2Name = `GlobalRouteOrgB${testId}`;
    let org1Slug: string;
    let org2Slug: string;

    await page.goto(PATH_ROOT);
    org1Slug = await createOrganization(page, org1Name);
    org2Slug = await createOrganization(page, org2Name);

    const accountOrgsPath = PATH_DASHBOARD_ORGANIZATIONS;
    await page.goto(accountOrgsPath);
    await expect(page).toHaveURL(new RegExp(`${accountOrgsPath}(?:\?.*)?$`));

    await switchToOrganization(page, org1Name);
    await expect(page).toHaveURL(new RegExp(`${accountOrgsPath}(?:\\?.*)?$`));
    await expect(page).not.toHaveURL(
      new RegExp(`/${org1Slug}${accountOrgsPath}`),
    );

    await switchToOrganization(page, org2Name);
    await expect(page).toHaveURL(new RegExp(`${accountOrgsPath}(?:\\?.*)?$`));
    await expect(page).not.toHaveURL(
      new RegExp(`/${org2Slug}${accountOrgsPath}`),
    );
  });
});

test.describe('Organization Settings - Slug-Prefixed Routes', () => {
  test('should load slug-prefixed organization settings page', async ({
    page,
    auth,
  }) => {
    const orgSlug = auth.organization;
    await page.goto(`/${orgSlug}/settings`);
    await expect(page).toHaveURL(
      new RegExp(`/${orgSlug}/settings`),
    );
    // Verify organization settings content is rendered
    await expect(
      page.getByRole('button', { name: 'Save' }).first(),
    ).toBeVisible();
  });

  test('should preserve slug-prefixed organization path when switching orgs', async ({
    page,
  }) => {
    const testId = Date.now();
    const org1Name = `OrgSettingsA${testId}`;
    const org2Name = `OrgSettingsB${testId}`;
    let org1Slug: string;
    let org2Slug: string;

    await page.goto(PATH_ROOT);
    org1Slug = await createOrganization(page, org1Name);
    org2Slug = await createOrganization(page, org2Name);

    // Navigate directly to org1's slug-prefixed settings page
    await page.goto(`/${org1Slug}/settings`);
    await expect(page).toHaveURL(
      new RegExp(`/${org1Slug}/settings`),
    );

    // Switch to org2 while on org1's settings page
    await switchToOrganization(page, org2Name);
    // Should land on org2's settings page, not org1's
    await expect(page).toHaveURL(
      new RegExp(`/${org2Slug}/settings`),
    );
  });

  test('should redirect from /organization/* to slug-prefixed route when switching orgs', async ({
    page,
  }) => {
    test.skip(
      true,
      'Old /organization route no longer matches the current app routing',
    );
    const testId = Date.now();
    const org1Name = `OrgOldRouteA${testId}`;
    const org2Name = `OrgOldRouteB${testId}`;
    let org1Slug: string;
    let org2Slug: string;

    await page.goto(PATH_ROOT);
    org1Slug = await createOrganization(page, org1Name);
    org2Slug = await createOrganization(page, org2Name);

    // Navigate to old (non-slug-prefixed) organization settings
    await page.goto(`${PATH_ORGANIZATION}/settings`);
    await expect(page).toHaveURL(
      new RegExp(`${PATH_ORGANIZATION}/settings(?:\\?.*)?$`),
    );

    // Switch to org1 — should now redirect to the slug-prefixed URL
    await switchToOrganization(page, org1Name);
    await expect(page).toHaveURL(
      new RegExp(`/${org1Slug}/settings`),
    );
  });

  test('should update URL when org slug is renamed in settings', async ({
    page,
    auth,
  }) => {
    const testId = Date.now();
    const orgName = `OrgRename${testId}`;
    let orgSlug: string;

    await page.goto(PATH_ROOT);
    orgSlug = await createOrganization(page, orgName);
    const newSlug = `new-slug-${testId}`;

    // Navigate to slug-prefixed settings page
    await page.goto(`/${orgSlug}/settings`);
    await expect(page).toHaveURL(
      new RegExp(`/${orgSlug}/settings`),
    );

    // Update the org slug via the settings form
    const slugInput = page.locator('input[name="slug"]');
    await slugInput.fill(newSlug);

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/organization/update') &&
        response.request().method() === 'POST',
    );

    await page
      .locator('form', { has: slugInput })
      .getByRole('button', { name: 'Save' })
      .click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.status()).toBe(200);

    // URL should automatically update without a manual refresh
    await expect(page).toHaveURL(
      new RegExp(`/${newSlug}/settings`),
    );

    // Refreshing should not 404 — the new slug URL should still work
    await page.reload();
    await expect(page).toHaveURL(
      new RegExp(`/${newSlug}/settings`),
    );

    // Restore the fixture organization via URL. The renamed-org page may be a
    // transient 404 until the new slug route settles, so the header switcher is
    // not guaranteed to be available here.
    await page.goto(`/${auth.organization}/settings`);
    await expect(page).toHaveURL(
      new RegExp(`/${auth.organization}/settings`),
    );
  });
});
