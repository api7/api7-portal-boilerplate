import { expect } from '@playwright/test';

import { test } from '../fixture';
import { deleteAllApplications } from '../req/common';
import {
  uiAddApplication,
  uiGetMoreOptionsButton,
  uiGoToApplications,
} from '../utils/ui';

test.describe('ValidateModal Copy Button', () => {
  const appName = `copy-btn-test-${+Date.now()}`;

  test.afterEach(async ({ ctx }) => {
    await deleteAllApplications(ctx);
  });

  test('copy button copies confirmText to clipboard in delete modal', async ({
    page,
    context,
  }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await uiGoToApplications(page);

    await test.step('create test application', async () => {
      await uiAddApplication(page, { name: appName, desc: 'test app' });
    });

    await test.step('open delete modal', async () => {
      const nameCell = page.getByRole('cell', {
        name: appName,
        exact: true,
      });
      await expect(nameCell).toBeVisible();

      const row = nameCell.locator('xpath=ancestor::tr[1]');
      const moreMenuBtn = uiGetMoreOptionsButton(row);
      await moreMenuBtn.click();

      const deleteBtn = page.getByRole('menuitem', { name: 'Delete' });
      await deleteBtn.click();

      await expect(
        page.getByText('Delete Application', { exact: true }),
      ).toBeVisible();
    });

    await test.step('verify copy button is visible and works', async () => {
      // The copy button should be visible next to the confirmText
      const copyBtn = page.getByRole('button', {
        name: 'Copy to clipboard',
      });
      await expect(copyBtn).toBeVisible();

      // Click the copy button
      await copyBtn.click();

      // After click, aria-label changes to "Copied" — re-query
      const copiedBtn = page.getByRole('button', { name: 'Copied' });
      await expect(copiedBtn).toBeVisible();

      // Verify clipboard content after the copy action has completed
      await expect
        .poll(async () => page.evaluate(() => navigator.clipboard.readText()))
        .toBe(appName);
    });

    await test.step('paste and confirm deletion works', async () => {
      const confirmInput = page.getByPlaceholder(appName);
      await confirmInput.focus();
      // Paste from clipboard
      await page.keyboard.press('ControlOrMeta+v');

      const confirmBtn = page.getByRole('button', { name: 'Save' });
      await expect(confirmBtn).toBeEnabled();
    });
  });
});
