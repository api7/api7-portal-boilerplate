import { test } from '../fixture';
import { expect, Page } from '@playwright/test';
import { PATH_ORGANIZATION, PATH_ROOT } from '@site/constants/path-prefix';
import { a7DefaultPortalID, A7Ctx } from '../req/dashboard/common';
import { uiVerifyToast } from '../utils/ui';
import { API_DEVELOPERS, AUTH_BASE_PATH } from '@site/constants/api-prefix';

const interceptOrgCreation = (page: Page): Promise<string> => {
  return new Promise((resolve) => {
    page.route(
      `**${AUTH_BASE_PATH}${PATH_ORGANIZATION}/create`,
      async (route) => {
        const response = await route.fetch();
        const body = await response.json();
        resolve(body.id);
        await route.fulfill({ response });
      }
    );
  });
};

const developerExists = async (
  a7Ctx: A7Ctx,
  portalId: string,
  developerId: string
) => {
  const developers = await a7Ctx
    .get(API_DEVELOPERS, {
      failOnStatusCode: false,
      params: {
        portal_id: portalId,
      },
    })
    .then((res) => res.json())
    .then((data) => data.list || []);
  return developers.some(
    (dev: { developer_id: string }) => dev.developer_id === developerId
  );
};

test.describe('Organization and Developer Sync', () => {
  test('developer should be created when organization is created via UI', async ({
    a7Ctx,
    page,
  }) => {
    const testId = `org-ui-create-${Date.now()}`;
    const orgName = `TestOrg${testId}`;
    const orgSlug = orgName.toLowerCase();
    // Get portal ID for checking developers
    const portalId = await a7DefaultPortalID(a7Ctx);

    await test.step('Verify that the creation and deletion of organization and corresponding developer are synchronized', async () => {
      await page.goto(PATH_ROOT);

      await page.getByRole('button', { name: 'Organization' }).click();
      await page.getByRole('menuitem', { name: 'Create Organization' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill(orgName);
      await page.getByRole('textbox', { name: 'Slug URL' }).fill(orgSlug);
      const [orgId] = await Promise.all([
        interceptOrgCreation(page),
        page.getByRole('button', { name: 'Create Organization' }).click(),
      ]);
      expect(orgId).toBeTruthy();

      await uiVerifyToast(page, { hasText: 'Organization created' });

      // Verify that the corresponding developer has been created
      expect(await developerExists(a7Ctx, portalId, orgId)).toBe(true);

      await page.getByRole('button', { name: 'Organization' }).click();
      await page.getByRole('button').click();
      await page.getByRole('button', { name: 'Delete Organization' }).click();
      await page
        .getByRole('textbox', { name: 'Enter the organization slug' })
        .fill(orgSlug);
      await page.getByRole('button', { name: 'Delete Organization' }).click();
      await uiVerifyToast(page, { hasText: 'Organization deleted' });

      // Verify that the corresponding developer has been deleted
      expect(await developerExists(a7Ctx, portalId, orgId!)).toBe(false);
    });
  });

  test('organization should be deletable when developer was already deleted from provider portal', async ({
    a7Ctx,
    page,
  }) => {
    const testId = `org-dev-deleted-${Date.now()}`;
    const orgName = `TestOrg${testId}`;
    const orgSlug = orgName.toLowerCase();
    const portalId = await a7DefaultPortalID(a7Ctx);

    await test.step('Create organization and verify developer exists', async () => {
      await page.goto(PATH_ROOT);

      await page.getByRole('button', { name: 'Organization' }).click();
      await page.getByRole('menuitem', { name: 'Create Organization' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill(orgName);
      await page.getByRole('textbox', { name: 'Slug URL' }).fill(orgSlug);
      const [orgId] = await Promise.all([
        interceptOrgCreation(page),
        page.getByRole('button', { name: 'Create Organization' }).click(),
      ]);
      expect(orgId).toBeTruthy();

      await uiVerifyToast(page, { hasText: 'Organization created' });

      // Verify developer was created
      expect(await developerExists(a7Ctx, portalId, orgId)).toBe(true);

      // Delete developer directly from provider portal (simulating admin action)
      const deleteRes = await a7Ctx.delete(
        `${API_DEVELOPERS}/${orgId}?portal_id=${portalId}`
      );
      expect(deleteRes.status()).toBe(200);

      // Verify developer is now deleted
      expect(await developerExists(a7Ctx, portalId, orgId)).toBe(false);

      // Now try to delete the organization - this should succeed even though developer is already gone
      await page.getByRole('button', { name: 'Organization' }).click();
      await page.getByRole('button').click();
      await page.getByRole('button', { name: 'Delete Organization' }).click();
      await page
        .getByRole('textbox', { name: 'Enter the organization slug' })
        .fill(orgSlug);
      await page.getByRole('button', { name: 'Delete Organization' }).click();
      await uiVerifyToast(page, { hasText: 'Organization deleted' });
    });
  });
});
