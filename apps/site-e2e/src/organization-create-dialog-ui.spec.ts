import { test } from '../fixture';
import { expect } from '@playwright/test';
import { PATH_ROOT } from '@site/constants/path-prefix';

test.describe('Create Organization Dialog UI', () => {
  test('should show updated URL field copy, tooltip, and domain prefix', async ({
    page,
  }) => {
    await page.goto(PATH_ROOT);
    await page.getByRole('button', { name: 'Organization', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Create Organization' }).click();

    const dialog = page.getByRole('dialog');

    await expect(
      dialog.getByText('Create an organization to collaborate with other members')
    ).toBeVisible();

    await expect(dialog.getByText('URL', { exact: true })).toBeVisible();

    const urlInput = dialog.locator('input[name="slug"]');
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveAttribute('placeholder', '');

    const hostPrefix = `${new URL(page.url()).host}/`;
    await expect(dialog.getByText(hostPrefix, { exact: true })).toBeVisible();

    const infoIcon = dialog.locator('button[data-slot="tooltip-trigger"]').first();
    await expect(infoIcon).toBeVisible();
    await infoIcon.hover();

    await expect(
      page.getByText(
        "This is your organization's URL namespace on developer portal. Within it, your team members can inspect their applications, or configure settings to their liking."
      )
    ).toBeVisible();
  });
});
