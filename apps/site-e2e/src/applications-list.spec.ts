import { test } from '../fixture';
import { expect } from '@playwright/test';
import { PATH_APPLICATIONS } from '@site/constants/path-prefix';
import { uiAddApplication, uiDeleteApplicationInList, uiVerifyToast } from '../utils/ui';
import { deleteAllApplications } from '../req/common';

test.describe('Test Applications List', () => {
  const testApps = [
    {
      name: 'Test App 1',
      desc: 'First test application',
      label: { key: 'env', value: 'test' },
    },
    {
      name: 'Test App 2',
      desc: 'Second test application',
      label: { key: 'type', value: 'web' },
    },
    {
      name: 'Test App 3',
      desc: 'Third test application',
      label: { key: 'env', value: 'prod' },
    },
  ];
  const newApp = {
    name: 'Test App 4',
    desc: 'Fourth test application',
    label: { key: 'env', value: 'test' },
  };

  test.beforeEach(async ({ page }) => {
    await page.goto(PATH_APPLICATIONS);
    // Wait for table to load (either shows data or "No Data")
    const noData = page.getByRole('cell', { name: 'No Data' });
    const firstMoreBtn = page.getByTestId('more').first();
    await expect(noData.or(firstMoreBtn)).toBeVisible();
    // Keep deleting first row until table is empty
    while (await firstMoreBtn.isVisible()) {
      const firstDataRow = page.getByRole('row').nth(1);
      const nameCell = firstDataRow.getByRole('cell').first();
      const name = await nameCell.textContent();
      await uiDeleteApplicationInList(page, name);
    }
  });

  test.afterEach(async ({ ctx }) => {
    await deleteAllApplications(ctx);
  });

  test('can visit applications page', async ({ page }) => {
    await expect(
      page.getByRole('main').getByText('My Applications')
    ).toBeVisible();
    await expect(page.getByTestId('application-table')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Add Application' })
    ).toBeVisible();
  });

  test('can add new application', async ({ page }) => {
    await test.step('create test application', async () => {
      await uiAddApplication(page, newApp);
    });

    await test.step('verify application appears in list', async () => {
      const nameCell = page.getByRole('cell', { name: newApp.name });
      await expect(nameCell).toBeVisible();

      const descCell = page.getByRole('cell', { name: newApp.desc });
      await expect(descCell).toBeVisible();
    });
  });

  test('can edit application', async ({ page }) => {
    const updatedName = `${newApp.name} Updated`;
    const updatedDesc = `${newApp.desc} Updated`;

    await test.step('create test application', async () => {
      await uiAddApplication(page, newApp);
    });

    await test.step('edit application', async () => {
      const nameCell = page.getByRole('cell', { name: newApp.name });
      const row = nameCell.locator('xpath=..');
      const moreMenuBtn = row.getByTestId('more');
      await moreMenuBtn.click();

      const editBtn = page.getByRole('menuitem', { name: 'Edit Basics' });
      await editBtn.click();

      const dialog = page.getByRole('dialog');
      const editTitle = dialog .getByText('Edit Application Basics', { exact: true });
      await expect(editTitle).toBeVisible();

      // Update fields
      await dialog.locator('input#name').clear();
      await dialog.locator('input#name').fill(updatedName);
      await dialog.locator('textarea#desc').clear();
      await dialog.locator('textarea#desc').fill(updatedDesc);

      const saveBtn = page.getByRole('button', { name: 'Save', exact: true });
      await saveBtn.click();

      await uiVerifyToast(page, {
        hasText: 'Edit Application Successfully',
      });
    });

    await test.step('verify changes', async () => {
      const updatedNameCell = page.getByRole('cell', { name: updatedName });
      await expect(updatedNameCell).toBeVisible();

      const updatedDescCell = page.getByRole('cell', { name: updatedDesc });
      await expect(updatedDescCell).toBeVisible();

      // Update testApp for cleanup
      testApps[0].name = updatedName;
    });
  });

  test('can delete application', async ({ page }) => {
    await test.step('create test application', async () => {
      await uiAddApplication(page, newApp);
    });

    await test.step('delete application', async () => {
      const nameCell = page.getByRole('cell', { name: newApp.name });
      const row = nameCell.locator('xpath=..');
      const moreMenuBtn = row.getByTestId('more');
      await moreMenuBtn.click();

      const deleteBtn = page.getByRole('menuitem', { name: 'Delete' });
      await deleteBtn.click();

      const deleteTitle = page.getByText('Delete Application', { exact: true });
      await expect(deleteTitle).toBeVisible();

      // Verify delete warning is shown
      await expect(
        page.getByText('Deleting this application will:')
      ).toBeVisible();
      await expect(
        page.getByText('Cancel all API subscriptions')
      ).toBeVisible();
      await expect(page.getByText('Delete all API credentials')).toBeVisible();

      // Confirm button should be disabled before typing confirmation
      const confirmBtn = page.getByRole('button', { name: 'Confirm' });
      await expect(confirmBtn).toBeDisabled();

      // Fill confirmation input
      const confirmInput = page.getByPlaceholder(newApp.name);
      await confirmInput.fill(newApp.name);

      // Confirm button should be enabled
      await expect(confirmBtn).toBeEnabled();
      await confirmBtn.click();

      await uiVerifyToast(page, {
        hasText: 'Delete Application Successfully',
      });
    });

    await test.step('verify application is removed', async () => {
      const nameCell = page.getByRole('cell', { name: newApp.name });
      await expect(nameCell).not.toBeAttached();
    });
  });

  test('can search applications', async ({ page }) => {
    await test.step('create test application', async () => {
      const addBtn = page.getByRole('button', { name: 'Add Application' });
      await addBtn.click();

      await page.locator('input#name').fill(newApp.name);
      await page.locator('textarea#desc').fill(newApp.desc);

      const addSubmit = page.getByRole('button', { name: 'Add', exact: true });
      await addSubmit.click();
      await uiVerifyToast(page, { hasText: 'Add Application Successfully' });
    });

    await test.step('search by name', async () => {
      const searchInput = page.getByPlaceholder(
        'Search name, description, label'
      );
      await searchInput.fill(newApp.name);
      await searchInput.press('Enter');

      const nameCell = page.getByRole('cell', { name: newApp.name });
      await expect(nameCell).toBeVisible();
    });

    await test.step('search by description', async () => {
      const searchInput = page.getByPlaceholder(
        'Search name, description, label'
      );
      await searchInput.clear();
      await searchInput.fill(newApp.desc);
      await searchInput.press('Enter');

      const nameCell = page.getByRole('cell', { name: newApp.name });
      await expect(nameCell).toBeVisible();
    });

    await test.step('search non-existent term', async () => {
      const searchInput = page.getByPlaceholder(
        'Search name, description, label'
      );
      await searchInput.clear();
      await searchInput.fill('non-existent-term');
      await searchInput.press('Enter');

      const nameCell = page.getByRole('cell', { name: newApp.name });
      await expect(nameCell).not.toBeAttached();
    });
  });

  test('can navigate to application detail', async ({ page }) => {
    await test.step('create test application', async () => {
      const addBtn = page.getByRole('button', { name: 'Add Application' });
      await addBtn.click();

      await page.locator('input#name').fill(newApp.name);
      await page.locator('textarea#desc').fill(newApp.desc);

      const addSubmit = page.getByRole('button', { name: 'Add', exact: true });
      await addSubmit.click();
      await uiVerifyToast(page, { hasText: 'Add Application Successfully' });
    });

    await test.step('click application name to navigate', async () => {
      const nameLink = page.getByText(newApp.name);
      await nameLink.click();

      // Should navigate to detail page
      await expect(page).toHaveURL(/\/applications\/detail\?id=.+$/);

      // Should show detail page elements
      await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
      await expect(
        page.getByRole('tab', { name: 'Subscriptions' })
      ).toBeVisible();
      await expect(
        page.getByRole('tab', { name: 'Authentication Type' })
      ).toBeVisible();
    });
  });

  test('can sort applications table', async ({ page }) => {
    await test.step('create test applications', async () => {
      for (const app of testApps) {
        await uiAddApplication(page, app);
      }
    });

    await test.step('sort by updated time', async () => {
      const updatedHeader = page.getByRole('columnheader', { name: 'Updated' });
      await updatedHeader.click();

      // Verify sorting indicator appears
      await expect(updatedHeader.locator('.anticon-caret-up')).toBeVisible();
    });

    await test.step('filter by label', async () => {
      // get count of application
      const count = (await page.locator('tbody tr').all()).length;

      const filterTrigger = page
        .getByRole('columnheader', { name: 'Labels' })
        .getByRole('button');
      await filterTrigger.click();
      
      // Filter by the first app's label value
      await page.locator(`label:has-text("${testApps[0].label.value}")`).click();
      await filterTrigger.click();
      
      // Should show only applications with matching label
      await expect(page.locator('tbody tr')).toHaveCount(1);
      await expect(page.getByRole('cell', { name: testApps[0].name })).toBeVisible();

      // Clear filter
      await filterTrigger.click();
      await page.locator(`label:has-text("${testApps[0].label.value}")`).click();
      await filterTrigger.click();
      
      // Should show all applications again
      await expect(page.locator('tbody tr')).toHaveCount(count);
    });
  });
}); 
