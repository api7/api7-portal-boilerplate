import { test } from '../fixture';
import { expect } from '@playwright/test';
import { deleteAllOrganizations } from '../req/common';

test.describe('Create Organization Dialog UI', () => {
  test.beforeEach(async ({ ctx }) => {
    // Remove existing organizations so the landing page shows the Add button
    await deleteAllOrganizations(ctx);
  });

  test('should show name field in create organization dialog', async ({
    page,
  }) => {
    await page.goto('/auth/landing');
    await page.getByRole('button', { name: 'Add' }).click();

    const dialog = page.getByRole('alertdialog');

    await expect(
      dialog.getByText(
        'Create an organization to collaborate with others and manage shared access.'
      )
    ).toBeVisible();

    // Name field should be visible
    const nameInput = dialog.locator('input[name="name"]');
    await expect(nameInput).toBeVisible();

    // Slug field is now auto-generated — should not be shown
    await expect(dialog.locator('input[name="slug"]')).not.toBeVisible();
  });

  test('should create organization with provided name and slug', async ({
    page,
  }) => {
    const uniqueName = `TestOrg-${Date.now()}`;
    await page.goto('/auth/landing');
    await page.getByRole('button', { name: 'Add' }).click();

    const dialog = page.getByRole('alertdialog');

    await dialog.locator('input[name="name"]').fill(uniqueName);
    await dialog.getByRole('button', { name: 'Create organization' }).click();

    // Dialog should close after successful creation
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  });
});

test.describe('Create Organization Dialog via Org Switcher', () => {
  test.setTimeout(60_000);

  test('should open create organization dialog when clicking create in org switcher', async ({
    page,
    auth,
  }) => {
    await page.goto(`/${auth.organization}/applications`);

    await page.getByTestId('org-switcher').click();

    const createItem = page
      .getByRole('menuitem')
      .filter({ hasText: 'Create organization' });
    await expect(createItem).toBeVisible();
    await createItem.click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[name="name"]')).toBeVisible();
  });
});
