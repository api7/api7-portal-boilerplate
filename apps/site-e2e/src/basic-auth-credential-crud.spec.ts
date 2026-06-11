import { expect } from '@playwright/test';

import { test } from '../fixture';
import {
  uiClickCellButton,
  uiDeleteCredential,
  uiGetMoreOptionsButton,
  uiGoToAPICredentials,
  uiVerifyToast,
} from '../utils/ui';

test.describe('Test Basic Auth Credential CRUD', () => {
  const defaultBasicAuth = 'default-basic-auth';
  const defaultBasicAuthUser = 'default-user';
  const defaultBasicAuthPass = 'default-pass';

  test('can CRUD basic auth credential', async ({ page }) => {
    const seed = (+Date.now()).toString();
    const basicAuthName = `${defaultBasicAuth}-${seed}`;
    const basicAuthUser = `${defaultBasicAuthUser}-${seed}`;
    const basicAuthPass = `${defaultBasicAuthPass}-${seed}`;

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
      await page.locator('input#name').fill(basicAuthName);
      await page.locator('input#basic-auth_username').fill(basicAuthUser);
      await page.locator('input#basic-auth_password').fill(basicAuthPass);

      // submit
      const addSubmit = page.getByTestId('drawer-footer').getByRole('button', { name: 'Add', exact: true });
      await addSubmit.click();
      await uiVerifyToast(page, {
        hasText: 'Add Basic Authentication Credential Successfully',
      });
      await expect(addTitle).toBeHidden();
    });

    // should exist basic auth
    const nameCell = page.getByRole('cell', { name: basicAuthName });
    await expect(nameCell).toBeVisible();
    const defaultRow = nameCell.locator('xpath=ancestor::tr[1]');

    await test.step('check detail drawer', async () => {
      // click name will show credential detail
      await uiClickCellButton(nameCell, basicAuthName);
      const detailTitle = page.getByText(
        'Basic Authentication Credential Detail',
      );
      await expect(detailTitle).toBeVisible();

      // username should be visible
      await expect(page.getByText(basicAuthUser)).toBeVisible();

      // the password is view-once: the detail shows a notice instead of the value
      await expect(page.getByText(/only shown once/i)).toBeVisible();
      await expect(page.getByText('********')).toBeHidden();

      // close detail drawer
      await page
        .getByTestId('drawer-footer')
        .getByRole('button', { name: 'Close' })
        .click();
      await expect(detailTitle).toBeHidden();
    });

    await test.step('check rotate credentials', async () => {
      const moreMenuBtn = uiGetMoreOptionsButton(defaultRow);
      await expect(moreMenuBtn).toBeVisible();
      await moreMenuBtn.click();
      const rotateBtn = page.getByRole('menuitem', { name: 'Rotate' });
      await expect(rotateBtn).toBeVisible();
      await rotateBtn.click();

      // rotate modal should show
      const rotateTitle = page.getByText(
        'Rotate Basic Authentication Credential',
        { exact: true },
      );
      await expect(rotateTitle).toBeVisible();

      // alert should show
      const rotateAlert = page.getByText(
        'After rotation, the username and password will be',
      );
      await expect(rotateAlert).toBeVisible();

      // fill username and password
      await page.locator('input#basic-auth_username').fill('newusername');
      await page.locator('input#basic-auth_password').fill('newpassword');

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

    const editBtn = defaultRow.getByRole('button', { name: 'Edit' });
    const moreMenuBtn = uiGetMoreOptionsButton(defaultRow);
    const nameInput = page.locator('input#name');
    const editBasicsTitle = page.getByText(
      'Edit Basic Authentication Credential',
      { exact: true },
    );

    const openEditBasicsDrawer = async () => {
      await expect(editBtn).toBeVisible();
      await editBtn.click();
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
      await expect(nameInput).toHaveValue(basicAuthName);

      // add labels
      const labelAddBtn = page.getByTestId('add-label-btn');
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
      const addSubmit = page.getByTestId('drawer-footer').getByRole('button', { name: 'Add', exact: true });
      await expect(addSubmit).toBeVisible();
      await addSubmit.click();

      // name is required
      await expect(page.getByText('Please enter Name')).toBeVisible();
      // username is required
      await expect(page.getByText('Please enter Username')).toBeVisible();
      // password is required
      await expect(page.getByText('Please enter Password')).toBeVisible();

      // fill form
      await page.locator('input#name').fill(data.name);
      await page.locator('input#basic-auth_username').fill(data.username);
      await page.locator('input#basic-auth_password').fill(data.password);

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
