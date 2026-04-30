import { test } from '../fixture';
import { expect, Page } from '@playwright/test';
import { PATH_ORGANIZATION, PATH_ROOT } from '@site/constants/path-prefix';
import { a7DefaultPortalID, a7DeveloperExists } from '../req/dashboard/common';
import { uiVerifyToast } from '../utils/ui';
import { API_DEVELOPERS, AUTH_BASE_PATH } from '@site/constants/api-prefix';

/**
 * Helper to create an organization via the switcher dropdown (no slug field).
 * Returns the org id and auto-generated slug from the response.
 */
const uiCreateOrganization = async (page: Page, orgName: string) => {
  // Open the org switcher dropdown, then click "Create Organization" menu item
  await page.getByRole('button', { name: 'Organization', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Create Organization' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.locator('input[name="name"]').fill(orgName);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(
        `${AUTH_BASE_PATH}${PATH_ORGANIZATION}/create`
      ) && response.request().method() === 'POST'
  );

  await dialog.getByRole('button', { name: 'Create' }).click();

  const response = await responsePromise;
  const body = await response.json();

  // Wait for dialog to close and reset pointer-events leaked by Radix Dialog
  await expect(dialog).not.toBeVisible({ timeout: 5000 });
  await page.evaluate(() => {
    document.body.style.pointerEvents = '';
    document.documentElement.style.pointerEvents = '';
  });
  await page.waitForTimeout(1000);

  return { id: body.id, slug: body.slug };
};

test.describe('Organization and Developer Sync', () => {
  test('developer should be created when organization is created via UI', async ({
    a7Ctx,
    page,
  }) => {
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

      await page.getByRole('button', { name: 'Organization' }).click();
      await page.getByRole('button').click();
      await page.getByRole('button', { name: 'Delete Organization' }).click();
      await page
        .getByRole('textbox', { name: 'Enter the organization slug' })
        .fill(org.slug);
      await page.getByRole('button', { name: 'Delete Organization' }).click();
      await uiVerifyToast(page, { hasText: 'Organization deleted' });

      // Verify that the corresponding developer has been deleted
      expect(await a7DeveloperExists(a7Ctx, portalId, org.id)).toBe(false);
    });
  });

  test('organization should be deletable when developer was already deleted from provider portal', async ({
    a7Ctx,
    page,
  }) => {
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
        `${API_DEVELOPERS}/${org.id}?portal_id=${portalId}`
      );
      expect(deleteRes.status()).toBe(200);

      // Verify developer is now deleted
      expect(await a7DeveloperExists(a7Ctx, portalId, org.id)).toBe(false);

      // Now try to delete the organization - this should succeed even though developer is already gone
      await page.getByRole('button', { name: 'Organization' }).click();
      await page.getByRole('button').click();
      await page.getByRole('button', { name: 'Delete Organization' }).click();
      await page
        .getByRole('textbox', { name: 'Enter the organization slug' })
        .fill(org.slug);
      await page.getByRole('button', { name: 'Delete Organization' }).click();
      await uiVerifyToast(page, { hasText: 'Organization deleted' });
    });
  });
});
