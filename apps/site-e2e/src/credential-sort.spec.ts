import { expect } from '@playwright/test';

import { test } from '../fixture';
import { deleteCredentials } from '../req/credential';
import {
  uiDeleteCredential,
  uiGoToAPICredentials,
  uiVerifyToast,
} from '../utils/ui';

test.describe('Test Credential table sort', () => {
  test.afterAll(async ({ ctx }) => {
    // clear
    await deleteCredentials(ctx);
  });

  const data = {
    name: 'Credential1',
    desc: 'Description1',
    label: { key: 'key1', value: 'value1' },
    name2: 'Credential2',
  };

  test('test search and sort', async ({ page }) => {
    test.setTimeout(120_000);
    await uiGoToAPICredentials(page);
    const nameCell1 = page.getByRole('cell', { name: data.name });
    const nameCell2 = page.getByRole('cell', { name: data.name2 });

    // Add first credential
    const addBtn = page.getByRole('button', {
      name: 'Add Key Authentication',
    });
    await addBtn.click();
    const addTitle = page
      .getByRole('dialog')
      .getByText('Add Key Authentication Credential', {
        exact: true,
      });
    await expect(addTitle).toBeVisible();

    await page.locator('#name').fill(data.name);
    await page.locator('#desc').fill(data.desc);
    await page.getByTestId('add-label-btn').click();
    await page.locator('#labels_0_key').fill(data.label.key);
    await page.locator('#labels_0_value').fill(data.label.value);

    const addSubmit = page.getByTestId('drawer-footer').getByRole('button', { name: 'Add', exact: true });
    await addSubmit.click();
    await uiVerifyToast(page, {
      hasText: 'Add Key Authentication Credential Successfully',
    });
    await expect(addTitle).toBeHidden();

    // Add second credential
    await addBtn.click();
    await expect(addTitle).toBeVisible();
    await page.locator('#name').fill(data.name2);
    await addSubmit.click();
    await uiVerifyToast(page, {
      hasText: 'Add Key Authentication Credential Successfully',
    });
    await expect(addTitle).toBeHidden();

    await test.step('can search by name, description and label', async () => {
      const searchInput = page.locator(
        '[placeholder="Search name, description, label"]',
      );

      // Search by name
      await searchInput.fill(data.name2);
      await searchInput.press('Enter');
      await expect(page.locator('tbody tr')).toHaveCount(1);
      await expect(page.getByRole('cell', { name: data.name2 })).toBeVisible();

      // Search by label
      await searchInput.fill(data.label.key);
      await searchInput.press('Enter');
      await expect(page.locator('tbody tr')).toHaveCount(1);
      await expect(page.getByRole('cell', { name: data.name })).toBeVisible();

      // Search by description
      await searchInput.fill(data.desc);
      await searchInput.press('Enter');
      await expect(page.locator('tbody tr')).toHaveCount(1);
      await expect(page.getByRole('cell', { name: data.name })).toBeVisible();

      // Clear search
      await searchInput.fill('');
      await searchInput.press('Enter');
      await expect(page.locator('tbody tr')).toHaveCount(2);
    });

    await test.step('can sort by updated time', async () => {
      const updatedColumn = page.locator('th:has-text("Updated")');
      await updatedColumn.click(); // Ascending
      await expect(page.locator('td').nth(0)).toHaveText(data.name);
      await updatedColumn.click(); // Descending
      await expect(page.locator('td').nth(0)).toHaveText(data.name2);
    });

    // clear data
    await test.step('delete', async () => {
      const items = [nameCell1, nameCell2];
      for (const nameCell of items) {
        await uiDeleteCredential(page, nameCell);
      }
    });
  });
});
