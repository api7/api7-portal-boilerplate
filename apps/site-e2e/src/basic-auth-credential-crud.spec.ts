import { test } from '../fixture';
import { expect } from '@playwright/test';
import { uiDeleteCredential, uiGoToAPICredentials, uiVerifyToast } from '../utils/ui';

test.describe('Test Basic Auth Credential CRUD', () => {
  const defaultBasicAuth = 'default-basic-auth';
  const defaultBasicAuthUser = 'default-user';
  const defaultBasicAuthPass = 'default-pass';

  test('can CRUD basic auth credential', async ({ page }) => {
    await uiGoToAPICredentials(page);
    // switch to Basic Authentication tab
    await page.getByRole('tab', { name: 'Basic Authentication' }).click();

    await test.step('create default basic auth', async () => {
      const addBtn = page.getByRole('button', {
        name: 'Add Basic Authentication',
      });
      await expect(addBtn).toBeVisible();
      await addBtn.click();

      const addTitle = page
        .getByRole('dialog')
        .getByText('Add Basic Authentication Credential', { exact: true });
      await expect(addTitle).toBeVisible();

      // fill form
      await page.locator('input#name').fill(defaultBasicAuth);
      await page
        .locator('input#basic-auth_username')
        .fill(defaultBasicAuthUser);
      await page
        .locator('input#basic-auth_password')
        .fill(defaultBasicAuthPass);

      // submit
      const addSubmit = page.getByRole('button', { name: 'Add', exact: true });
      await addSubmit.click();
      await uiVerifyToast(page, {
        hasText: 'Add Basic Authentication Credential Successfully',
      });
      await expect(addTitle).toBeHidden();
    });

    // should exist basic auth
    const nameCell = page.getByRole('cell', { name: defaultBasicAuth });
    await expect(nameCell).toBeVisible();
    const defaultRow = nameCell.locator('xpath=..');

    await test.step('check detail drawer', async () => {
      // click name will show credential detail
      await nameCell.locator('a').click();
      const detailTitle = page.getByText(
        'Basic Authentication Credential Detail'
      );
      await expect(detailTitle).toBeVisible();

      // username should be visible
      await expect(page.getByText(defaultBasicAuthUser)).toBeVisible();

      // password should be masked and have copy button
      const passwordMask = page.getByText('********');
      await expect(passwordMask).toBeVisible();
      const copyBtn = passwordMask.locator('xpath=..').locator('button');
      await expect(copyBtn).toBeVisible();

      // click copy btn and check copied password
      await copyBtn.click();
      const oldCopiedPassword = await page.evaluate(() =>
        navigator.clipboard.readText()
      );
      expect(oldCopiedPassword).toBe(defaultBasicAuthPass);

      // close detail drawer
      await page
        .locator('.ant-drawer-footer')
        .getByRole('button', { name: 'Close' })
        .click();
      await expect(detailTitle).toBeHidden();
    });

    await test.step('check rotate credentials', async () => {
      const rotateBtn = defaultRow.getByRole('button', { name: 'Rotate' });
      await expect(rotateBtn).toBeVisible();
      await rotateBtn.click();

      // rotate modal should show
      const rotateTitle = page.getByText(
        'Rotate Basic Authentication Credential',
        { exact: true }
      );
      await expect(rotateTitle).toBeVisible();

      // alert should show
      const rotateAlert = page.getByText(
        'After rotation, the username and password will be'
      );
      await expect(rotateAlert).toBeVisible();

      // fill username and password
      await page
        .locator('input#basic-auth_username')
        .fill('newusername');
      await page
        .locator('input#basic-auth_password')
        .fill('newpassword');

      // confirm rotation
      const confirmBtn = page.getByRole('button', { name: 'Confirm' });
      await expect(confirmBtn).toBeEnabled();
      await confirmBtn.click();

      // toast
      await uiVerifyToast(page, {
        hasText: 'Rotate Basic Authentication Credential Successfully',
      });

      // rotate modal should not exist
      await expect(rotateTitle).toBeHidden();
    });

    const moreMenuBtn = defaultRow.locator('button.ant-dropdown-trigger');
    const nameInput = page.locator('input#name');
    const editBasicsTitle = page.getByText(
      'Edit Basic Authentication Credential',
      { exact: true }
    );

    const openEditBasicsDrawer = async () => {
      await expect(moreMenuBtn).toBeVisible();
      await moreMenuBtn.click();
      const editBasicsBtn = page.getByRole('menuitem', { name: 'Edit Basics' });
      await expect(editBasicsBtn).toBeVisible();
      await editBasicsBtn.click();
      await expect(editBasicsTitle).toBeVisible();
    };

    const saveEditBasicsDrawer = async () => {
      await page.getByRole('button', { name: 'Save' }).click();
      await uiVerifyToast(page, {
        hasText: 'Edit Basic Authentication Credential Successfully',
      });
      await expect(editBasicsTitle).toBeHidden();
    };

    await test.step('edit basics', async () => {
      await openEditBasicsDrawer();
      await expect(nameInput).toHaveValue(defaultBasicAuth);

      // add labels
      const labelAddBtn = page.getByRole('button', { name: 'plus Add' });
      await labelAddBtn.click();
      await page.locator('input#labels_0_key').fill('env');
      await page.locator('input#labels_0_value').fill('prod');

      await saveEditBasicsDrawer();
      await expect(defaultRow.getByText('env:prod')).toBeVisible();
    });

    await test.step('delete', async () => {
      await uiDeleteCredential(page, nameCell);
    });
  });

  test('validate basic auth credential form', async ({ page }) => {
    const seed = (+Date.now()).toString();
    const data = {
      name: `test-basic-${seed}`,
      username: 'testuser',
      password: 'testpass',
    };

    await uiGoToAPICredentials(page);
    await page.getByRole('tab', { name: 'Basic Authentication' }).click();

    const addBtn = page.getByRole('button', {
      name: 'Add Basic Authentication',
    });
    const nameCell = page.getByRole('cell', { name: data.name });

    await test.step('validate form fields', async () => {
      await expect(addBtn).toBeVisible();
      await addBtn.click();

      const addTitle = page
        .getByRole('dialog')
        .getByText('Add Basic Authentication Credential', { exact: true });
      await expect(addTitle).toBeVisible();

      // click add directly, should show validation errors
      const addSubmit = page.getByRole('button', { name: 'Add', exact: true });
      await expect(addSubmit).toBeVisible();
      await addSubmit.click();

      // name is required
      await expect(page.getByText('Please enter Name')).toBeVisible();
      // username is required
      await expect(page.getByText('Please enter Username')).toBeVisible();
      // password is required
      await expect(
        page.getByText(
          "Enter a custom password or click 'Generate' to create a random one."
        )
      ).toBeVisible();

      // fill form
      await page.locator('input#name').fill(data.name);
      await page
        .locator('input#basic-auth_username')
        .fill(data.username);
      await page
        .locator('input#basic-auth_password')
        .fill(data.password);

      // submit
      await addSubmit.click();
      await uiVerifyToast(page, {
        hasText: 'Add Basic Authentication Credential Successfully',
      });
      await expect(addTitle).toBeHidden();

      // the new credential exist in list
      await expect(nameCell).toBeVisible();
    });

    await test.step('delete', async () => {
      await uiDeleteCredential(page, nameCell);
    });
  });
});
