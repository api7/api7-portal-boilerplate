import { test } from '../fixture';
import { expect } from '@playwright/test';
import { deleteAllOrganizations } from '../req/common';

test.describe('Create Organization Dialog UI', () => {
  test.beforeEach(async ({ ctx }) => {
    // Remove existing organizations so the landing page shows the Add button
    await deleteAllOrganizations(ctx);
  });

  test('should not show slug input field in create organization dialog', async ({
    page,
  }) => {
    await page.goto('/auth/landing');
    await page.getByRole('button', { name: 'Add' }).click();

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByText(
        'Create an organization to collaborate with other members'
      )
    ).toBeVisible();

    // Name field should be visible
    const nameInput = dialog.locator('input[name="name"]');
    await expect(nameInput).toBeVisible();

    // Slug input should NOT be visible
    await expect(dialog.locator('input[name="slug"]')).not.toBeVisible();
    await expect(dialog.getByText('URL', { exact: true })).not.toBeVisible();
  });

  test('should create organization with auto-generated slug', async ({
    page,
  }) => {
    const uniqueName = `TestOrg-${Date.now()}`;
    await page.goto('/auth/landing');
    await page.getByRole('button', { name: 'Add' }).click();

    const dialog = page.getByRole('dialog');

    await dialog.locator('input[name="name"]').fill(uniqueName);
    await dialog.getByRole('button', { name: 'Create' }).click();

    // Dialog should close after successful creation
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  });
});
