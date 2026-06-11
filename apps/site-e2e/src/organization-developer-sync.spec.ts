import { Page, expect } from '@playwright/test';
import { API_DEVELOPERS, AUTH_BASE_PATH } from '@site/constants/api-prefix';
import { PATH_ACCOUNT, PATH_ROOT } from '@site/constants/path-prefix';

import { test } from '../fixture';
import { a7DefaultPortalID, a7DeveloperExists } from '../req/dashboard/common';
import { uiVerifyToast } from '../utils/ui';

/**
 * Helper to create an organization via the switcher dropdown (no slug field).
 * Returns the org id and auto-generated slug from the response.
 */
const uiCreateOrganization = async (page: Page, orgName: string) => {
  await page.goto(`${PATH_ACCOUNT}/organizations`);
  await page.getByRole('button', { name: 'Create Organization' }).click();

  const dialog = page.getByRole('alertdialog');
  await dialog.locator('input[name="name"]').fill(orgName);
  await dialog.getByRole('button', { name: 'Create Organization' }).click();

  // Slug is auto-generated server-side; wait for dialog to close then look up
  // the new org by name from the organizations list.
  await expect(dialog).not.toBeVisible({ timeout: 10_000 });

  const listRes = await page.request.get(
    `${AUTH_BASE_PATH}/organization/list`,
  );
  expect(listRes.status()).toBe(200);
  const orgs: Array<{ id: string; name: string; slug: string }> = await listRes.json();
  const newOrg = orgs.find((o) => o.name === orgName);
  expect(newOrg).toBeTruthy();
  const { id, slug } = newOrg!;

  await page.goto(`/${slug}/applications`);
  await page.waitForURL(
    (url) =>
      url.pathname === `/${slug}/applications` ||
      url.pathname.startsWith(`/${slug}/applications/`),
    { timeout: 15_000 },
  );

  await page.waitForTimeout(500);

  return { id, slug };
};

const uiDeleteOrganization = async (page: Page, orgSlug: string) => {
  await page.goto(`/${orgSlug}/settings`);
  await page.getByRole('button', { name: 'Delete Organization' }).click();
  // DeleteOrganizationDialog has no slug confirmation input — just a submit button.
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete Organization' })
    .click();
};

test.describe('Organization and Developer Sync', () => {
  test('developer should be created when organization is created via UI', async ({
    a7Ctx,
    page,
  }) => {
    test.setTimeout(90_000);
    const testId = `org-ui-create-${Date.now()}`;
    const orgName = `TestOrg${testId}`;
    // Get portal ID for checking developers
    const portalId = await a7DefaultPortalID(a7Ctx);

    await test.step('Verify that the creation and deletion of organization and corresponding developer are synchronized', async () => {
      await page.goto(PATH_ROOT);

      const org = await uiCreateOrganization(page, orgName);
      expect(org.id).toBeTruthy();

      // Verify that the corresponding developer has been created
      expect(await a7DeveloperExists(a7Ctx, portalId, org.id)).toBe(true);

      await uiDeleteOrganization(page, org.slug);
      await uiVerifyToast(page, { hasText: 'Organization deleted' });

      // Verify that the corresponding developer has been deleted
      expect(await a7DeveloperExists(a7Ctx, portalId, org.id)).toBe(false);
    });
  });

  test('organization should be deletable when developer was already deleted from provider portal', async ({
    a7Ctx,
    page,
  }) => {
    test.setTimeout(90_000);
    const testId = `org-dev-deleted-${Date.now()}`;
    const orgName = `TestOrg${testId}`;
    const portalId = await a7DefaultPortalID(a7Ctx);

    await test.step('Create organization and verify developer exists', async () => {
      await page.goto(PATH_ROOT);

      const org = await uiCreateOrganization(page, orgName);
      expect(org.id).toBeTruthy();

      // Verify developer was created
      expect(await a7DeveloperExists(a7Ctx, portalId, org.id)).toBe(true);

      // Delete developer directly from provider portal (simulating admin action)
      const deleteRes = await a7Ctx.delete(
        `${API_DEVELOPERS}/${org.id}?portal_id=${portalId}`,
      );
      expect(deleteRes.status()).toBe(200);

      // Verify developer is now deleted
      expect(await a7DeveloperExists(a7Ctx, portalId, org.id)).toBe(false);

      // Now try to delete the organization - this should succeed even though developer is already gone
      await uiDeleteOrganization(page, org.slug);
      await uiVerifyToast(page, { hasText: 'Organization deleted' });
    });
  });
});
