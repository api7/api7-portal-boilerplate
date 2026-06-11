import { expect } from '@playwright/test';
import { PATH_ROOT } from '@site/constants/path-prefix';

import { test } from '../fixture';
import {
  uiAddAPIKeyCredential,
  uiClickCellButton,
  uiDeleteCredential,
  uiGetMoreOptionsButton,
  uiGoToAPICredentials,
  uiVerifyToast,
} from '../utils/ui';

test.describe('Test Credential CRUD', () => {
  test('can visit credential', async ({ page }) => {
    await uiGoToAPICredentials(page);
    await expect(
      page.getByRole('main').getByText('Authentication Type'),
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Key Authentication' }),
    ).toBeVisible();
  });

  const defaultKeyAuth = 'default-key-auth';
  test('can RUD default key auth', async ({ page }) => {
    await uiGoToAPICredentials(page);
    await uiAddAPIKeyCredential(page);
    const nameCell = page.getByRole('cell', { name: defaultKeyAuth }).first();
    const defaultRow = nameCell.locator('xpath=ancestor::tr[1]');

    await test.step('check detail drawer and rotate key', async () => {
      //# check detail drawer
      // click name will show credential detail
      await uiClickCellButton(nameCell, defaultKeyAuth);
      const detailTitle = page.getByText(
        'Key Authentication Credential Detail',
      );
      await expect(detailTitle).toBeVisible();
      // the key is view-once: the detail shows a notice instead of the value
      await expect(page.getByText(/only shown once/i)).toBeVisible();
      await expect(page.getByText('********')).toBeHidden();
      // close detail drawer
      await page
        .getByTestId('drawer-footer')
        .getByRole('button', { name: 'Close' })
        .click();
      await expect(detailTitle).toBeHidden();

      //# check rotate key
      const moreMenuBtn = uiGetMoreOptionsButton(defaultRow);
      await expect(moreMenuBtn).toBeVisible();
      await moreMenuBtn.click();
      const rotateBtn = page.getByRole('menuitem', { name: 'Rotate' });
      await expect(rotateBtn).toBeVisible();
      await rotateBtn.click();

      // rotate modal should show
      const rotateTitle = page.getByText(
        'Rotate Key Authentication Credential',
        { exact: true },
      );
      await expect(rotateTitle).toBeVisible();
      // alert also should show
      const rotateAlert = page.getByText('After rotation, a new key');
      await expect(rotateAlert).toBeVisible();
      // confirm button should be disabled before fill confirm input
      const confirmBtn = page.getByRole('button', { name: 'Confirm' });
      await expect(confirmBtn).toBeDisabled();
      // fill confirm input
      const confirmInput = page.getByPlaceholder(defaultKeyAuth);
      await confirmInput.fill(defaultKeyAuth);
      // confirm btn should be enabled
      await expect(confirmBtn).toBeEnabled();
      await confirmBtn.click();
      // toast
      await uiVerifyToast(page, {
        hasText: 'Rotate Key Authentication Credential Successfully',
      });
      // rotate modal should not exist
      await expect(rotateTitle).toBeHidden();

      // the regenerated key is revealed once after rotation (view-once)
      await expect(
        page.getByText(/the old key has been invalidated/i),
      ).toBeVisible();
    });

    const editBtn = defaultRow.getByRole('button', { name: 'Edit' });
    const moreMenuBtn = uiGetMoreOptionsButton(defaultRow);

    const nameInput = page.locator('input#name');
    const editBasicsTitle = page.getByText(
      'Edit Key Authentication Credential',
      { exact: true },
    );

    const openEditBasicsDrawer = async () => {
      await expect(editBtn).toBeVisible();
      await editBtn.click();
      // edit basics drawer should show
      await expect(editBasicsTitle).toBeVisible();
    };

    const saveEditBasicsDrawer = async () => {
      await page.getByRole('button', { name: 'Save' }).click();
      await uiVerifyToast(page, {
        hasText: 'Edit Key Authentication Credential Successfully',
      });
      await expect(editBasicsTitle).toBeHidden();
    };

    await test.step('only edit basics name, labels should be transformed when saved', async () => {
      const newName = `${defaultKeyAuth}test`;
      // edit name
      await openEditBasicsDrawer();
      await expect(nameInput).toHaveValue(defaultKeyAuth);
      await nameInput.clear();
      await nameInput.fill(newName);
      await saveEditBasicsDrawer();

      // reopen, undo
      await openEditBasicsDrawer();
      await expect(nameInput).toHaveValue(newName);
      await nameInput.clear();
      await nameInput.fill(defaultKeyAuth);
      await saveEditBasicsDrawer();
    });

    await test.step('edit basics normally', async () => {
      await openEditBasicsDrawer();

      await expect(nameInput).toHaveValue(defaultKeyAuth);

      // labels
      const labelAddBtn = page.getByTestId('add-label-btn');
      await labelAddBtn.click();
      // add label
      await page.locator('input#labels_0_key').fill('key1');
      await page.locator('input#labels_0_value').fill('value1');
      await labelAddBtn.click();

      await page.locator('input#labels_1_key').fill('key2');
      await page.locator('input#labels_1_value').fill('value2');
      await labelAddBtn.click();

      await page.locator('input#labels_2_key').fill('key3');
      await page.locator('input#labels_2_value').fill('value3');
      await labelAddBtn.click();

      // cannot add dup key
      await page.locator('input#labels_3_key').fill('key3');
      await page.locator('input#labels_3_value').fill('value3');
      await expect(page.getByText('Duplicate keys')).toBeVisible();
      // clear invalid
      await page.getByTestId('delete-label-3').click();

      // delete the 2nd label, others should still exist
      await page.getByTestId('delete-label-1').click();
      await expect(page.locator('input#labels_0_key')).toHaveValue('key1');
      await expect(page.locator('input#labels_0_value')).toHaveValue('value1');
      await expect(page.locator('input#labels_1_key')).toHaveValue('key3');
      await expect(page.locator('input#labels_1_value')).toHaveValue('value3');

      await saveEditBasicsDrawer();

      // label should exist in list
      await expect(defaultRow.getByText('key1:value1')).toBeVisible();

      // reopen edit basics
      await openEditBasicsDrawer();
      await expect(page.locator('input#labels_0_key')).toHaveValue('key1');
      await expect(page.locator('input#labels_0_value')).toHaveValue('value1');
      await expect(page.locator('input#labels_1_key')).toHaveValue('key3');
      await expect(page.locator('input#labels_1_value')).toHaveValue('value3');

      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(editBasicsTitle).toBeHidden();
    });

    await test.step('show delete', async () => {
      await expect(moreMenuBtn).toBeVisible();
      await moreMenuBtn.click();
      const deleteBtn = page.getByRole('menuitem', {
        name: 'Delete',
      });
      await expect(deleteBtn).toBeVisible();
      await deleteBtn.click();
      // delete modal should show
      await expect(page.getByText('Delete Credential')).toBeVisible();
    });
  });

  test('can CD credential', async ({ page }) => {
    const seed = (+Date.now()).toString();
    const data = {
      name: `test-${seed}`,
    };
    await uiGoToAPICredentials(page);

    const addBtn = page.getByRole('button', {
      name: 'Add Key Authentication',
    });
    const nameCell = page.getByRole('cell', { name: data.name });

    await test.step('delete', async () => {
      await expect(addBtn).toBeVisible();
      await addBtn.click();

      const addTitle = page
        .getByRole('dialog')
        .getByText('Add Key Authentication Credential', {
          exact: true,
        });
      await expect(addTitle).toBeVisible();

      //# click add directly, should cannot submit
      const addSubmit = page.getByTestId('drawer-footer').getByRole('button', { name: 'Add', exact: true });
      await expect(addSubmit).toBeVisible();
      await addSubmit.click();
      // name is required
      const nameErrMsg = page.getByText('Please enter Name');
      await expect(nameErrMsg).toBeVisible();

      //# fill, and can submit normally
      // name
      const nameInput = page.locator('input#name');
      // default is empty
      await expect(nameInput).toHaveAttribute('value', '');
      nameInput.fill(data.name);

      // key alert should show
      await expect(
        page.getByText(
          'A random key will be automatically generated. You cannot specify a custom key value.',
        ),
      ).toBeVisible();

      // submit
      await addSubmit.click();
      await uiVerifyToast(page, {
        hasText: 'Add Key Authentication Credential Successfully',
      });
      await expect(addTitle).toBeHidden();

      // the new credential exist in list
      await expect(nameCell).toBeVisible();

      // reopen, ensure old data cleared
      await addBtn.click();
      await expect(nameInput).toHaveAttribute('value', '');
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(addTitle).toBeHidden();
    });

    await test.step('delete', async () => {
      await uiDeleteCredential(page, nameCell);
    });
  });
});
