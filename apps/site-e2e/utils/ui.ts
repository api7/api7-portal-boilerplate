import { expect, Locator, Page } from '@playwright/test';
import {
  PATH_API_HUB,
  PATH_APPLICATIONS,
  PATH_LOGIN,
} from '@site/constants/path-prefix';
import { getLastEmail } from '../req/email';
import { getDefaultApplicationId } from '../req/common';
import { BetterAuthLogin } from '../req/type';

export const uiVerifyToast = async (
  page: Page,
  ...params: Parameters<Locator['filter']>
) => {
  const toast = page.locator('li').filter(...params);
  await expect(toast).toBeVisible();
  // Try to close the toast; if pointer-events blocks it or toast auto-dismisses, just wait it out
  await toast
    .getByLabel('Close toast')
    .click({ force: true, timeout: 3000 })
    .catch(() => {});
  // Wait for toast to disappear (auto-dismiss fallback ~5s)
  await expect(toast).toBeHidden({ timeout: 10000 });
};
export const uiLogin = async (
  page: Page,
  auth: BetterAuthLogin,
  { onetime = false, goToLogin = false } = {}
) => {
  if (goToLogin) await page.goto(PATH_LOGIN);
  await page.getByRole('textbox', { name: 'Email' }).fill(auth.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(auth.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Account' }).click();
  await expect(page.getByRole('link', { name: 'Sign Out' })).toBeVisible();
  // click to close user menu
  await page.locator('html').click();
};
export const uiLogout = async (page: Page) => {
  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('link', { name: 'Sign Out' }).click();
  await expect(page.getByText('Sign In', { exact: true })).toBeVisible();
};

export const uiDeleteCredential = async (page: Page, nameCell: Locator) => {
  const moreMenuBtn = nameCell
    .locator('xpath=..')
    .locator('button.ant-dropdown-trigger');

  await moreMenuBtn.click();
  const deleteBtn = page.getByRole('menuitem', {
    name: 'Delete',
  });
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();
  // delete modal should show
  const deleteTitle = page.getByText('Delete Credential', { exact: true });
  await expect(deleteTitle).toBeVisible();
  // confirm button should be disabled before fill confirm input
  const confirmBtn = page.getByRole('button', { name: 'Confirm' });
  await expect(confirmBtn).toBeDisabled();
  // fill confirm input
  const confirmText = await nameCell.innerText();
  const confirmInput = page.getByPlaceholder(confirmText);
  await confirmInput.fill(confirmText);
  // confirm btn should be enabled
  await expect(confirmBtn).toBeEnabled();
  await confirmBtn.click();
  // toast
  await uiVerifyToast(page, {
    hasText: 'Delete Credential Successfully',
  });
  // delete modal should not exist
  await expect(deleteTitle).toBeHidden();
  // the credential should disappear
  await expect(nameCell).not.toBeAttached();
};

type uiSubscribeProductProductParams = {
  productName: string;
};
export const uiSubscribeProductProduct = async (
  page: Page,
  params: uiSubscribeProductProductParams
) => {
  const { productName } = params;
  // Subscribe to auto approval product
  await page.getByRole('button', { name: 'Subscribe to New API Product' }).click();
  const modal = page.getByRole('dialog', {
    name: 'Subscribe to New API Product',
  });
  await expect(modal.getByText('Search')).toBeVisible();
  await page.waitForTimeout(1000);
  const searchEl = modal.locator('.ant-select');
  // cause this is a div
  await searchEl.click({ force: true });
  await page.waitForTimeout(1000);
  const productOption = page.getByTestId(`option-${productName}`);
  await expect(productOption).toBeVisible();
  await productOption.click({ force: true, position: { x: 20, y: 0 } });
  // click dialog title to close the dropdown
  await modal.getByText('Subscribe to New API Product').click();
  await modal.getByRole('button', { name: 'Subscribe', exact: true }).click();
  await expect(modal).toBeHidden();
  await uiVerifyToast(page, {
    hasText: 'Subscribed to API Product Successfully',
  });
};

type UISubscribeProductApplicationParams = {
  applicationName: string;
};
export const uiSubscribeProductApplication = async (page: Page, params: UISubscribeProductApplicationParams) => {
  const { applicationName } = params;
  const dialog = page.getByRole('dialog', { name: 'Subscribe Application to API Product' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Search and select applications')).toBeVisible();
  await page.waitForTimeout(1000);
  const searchEl = dialog.locator('.ant-select');
  // cause this is a div
  await searchEl.click({ force: true });
  await page.waitForTimeout(1000);
  const option = page.getByTestId(`option-${applicationName}`);
  await expect(option).toBeVisible();
  await option.click({ force: true, position: { x: 20, y: 0 } });
  // close dropdown
  await dialog.getByText('Subscribe Application to API Product').click();
  await dialog.getByRole('button', { name: 'Subscribe', exact: true }).click();
  await uiVerifyToast(page, { hasText: 'Subscribe Application to API Product Successfully' });
};

type UISubscribeProductParams = {
  productId: string;
} & UISubscribeProductApplicationParams;
export const uiSubscribeProductInAPIHub = async (page: Page, params: UISubscribeProductParams) => {
  const { applicationName, productId } = params;

  await page.waitForTimeout(1000);
  await page.goto(`${PATH_API_HUB}/detail?id=${productId}`);
  await page.getByRole('tab', { name: 'Subscriptions' }).click();
  const subscribeBtn = page.getByRole('button', {
    name: 'Subscribe to Application',
  });
  await expect(subscribeBtn).toBeVisible();
  await subscribeBtn.click();
  await uiSubscribeProductApplication(page, { applicationName });
};

export const uiUnsubscribeProductInAPIHub = async (
  page: Page,
  params: UISubscribeProductParams
) => {
  const { applicationName, productId } = params;
  await page.goto(`${PATH_API_HUB}/detail?id=${productId}`);
  await page.getByRole('tab', { name: 'Subscriptions' }).click();
  const row = page
    .getByRole('cell', { name: applicationName })
    .locator('xpath=..');
  const moreMenuBtn = row.getByTestId('more');
  await moreMenuBtn.click();
  const unsubscribeBtn = page.getByRole('menuitem', { name: 'Unsubscribe' });
  await expect(unsubscribeBtn).toBeVisible();
  await unsubscribeBtn.click();
  const unsubscribeModal = page.getByRole('dialog', {
    name: 'Unsubscribe',
  });
  await expect(unsubscribeModal).toBeVisible();
  const confirmInput = page.getByPlaceholder(applicationName);
  await confirmInput.fill(applicationName);
  const confirmBtn = page.getByRole('button', { name: 'Confirm' });
  await expect(confirmBtn).toBeEnabled();
  await confirmBtn.click();
  await uiVerifyToast(page, {
    hasText: 'Successfully',
  });
  await expect(unsubscribeModal).toBeHidden();
  await expect(row).not.toBeAttached();
};

export const uiSubscribePublicGatewayProduct = async (page: Page) => {
  const alertText =
    'You are currently not subscribed to this API Product. You can view API details but cannot make API calls.';
  await expect(page.getByText(alertText)).toBeVisible();
  await page.getByRole('button', { name: 'Subscribe Now' }).click();
  await uiVerifyToast(page, { hasText: 'Subscribe Product Successfully' });
};
export const uiShowNotFound = async (page: Page) => {
  const altText = page.getByAltText('Error 404 not found Illustration');
  await expect(altText).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go Back' })).toBeVisible();
};
export const uiShowLogin = async (page: Page) => {
  await page.waitForTimeout(1000); // Wait 1 second
  const loginBtn = page.getByRole('button', { name: 'Login', exact: true });
  await expect(loginBtn).toBeVisible();
};
export const uiAPIHubSearchProduct = async (
  page: Page,
  productName: string
) => {
  await page.goto(PATH_API_HUB);
  const search = page.getByRole('textbox', { name: 'Search' });
  await search.click();
  await search.clear();
  await search.fill(productName);
  await search.press('Enter');
};

const uiOpenDefaultApplicationDetail = async (page: Page) => {
  await uiGoToApplications(page);
  const defaultApp = page.getByRole('cell', {
    name: 'default',
    exact: true,
  });
  await expect(defaultApp).toBeVisible();
  await defaultApp.locator('a').click();
  await page.waitForURL(new RegExp(`${PATH_APPLICATIONS}/detail\\?id=.*`));
};

/**
 * Go to Authentication Type page
 * @param page - Playwright page
 * @param applicationId - Application ID (optional, will find 'default' app if not provided)
 */
export const uiGoToAPICredentials = async (page: Page, applicationId?: string) => {
  if (applicationId) {
    await page.goto(`${PATH_APPLICATIONS}/detail?id=${applicationId}`);
  } else {
    try {
      const appId = await getDefaultApplicationId(page.request);
      await page.goto(`${PATH_APPLICATIONS}/detail?id=${appId}`);
    } catch {
      await uiOpenDefaultApplicationDetail(page);
    }
  }
  await page.getByRole('tab', { name: 'Authentication Type' }).click();
};
export const uiAddAPIKeyCredential = async (page: Page, name = 'default-key-auth') => {
  await uiGoToAPICredentials(page);
  // Skip creation if credential already exists (e.g. from a previous retry)
  const existingCell = page.getByRole('cell', { name }).first();
  if (await existingCell.isVisible().catch(() => false)) {
    return;
  }
  const button = page.locator(
    'button:has-text("Add Key Authentication Credential")'
  );
  await button.click();
  await page.locator('#name').fill(name);
  await page
    .locator('.ant-drawer-footer')
    .locator('button:has-text("Add")')
    .click();
  await page.waitForTimeout(1000);
  await uiGoToAPICredentials(page);
  // should exist the key auth
  const nameCell = page.getByRole('cell', { name }).first();
  await expect(nameCell).toBeVisible();
};

export const uiGetCredentialKeyAuth = async (
  page: Page,
  name = 'default-key-auth'
) => {
  await uiGoToAPICredentials(page);
  // should exist default key auth (use .first() to handle duplicate rows from retries)
  const nameCell = page.getByRole('cell', { name }).first();
  await expect(nameCell).toBeVisible();
  // click name will show credential detail
  await nameCell.locator('a').click();
  const detailTitle = page.getByText('Key Authentication Credential Detail');
  await expect(detailTitle).toBeVisible();
  // mask and copy button should be visible
  const keyMask = page.getByText('********');
  await expect(keyMask).toBeVisible();
  const copyBtn = keyMask.locator('xpath=..').locator('button');
  await expect(copyBtn).toBeVisible();
  // click copy btn and check copied key
  await copyBtn.click();
  return page.evaluate(() => navigator.clipboard.readText());
};
/**
 * Navigate to Applications list page
 * @param page - Playwright page
 */
export const uiGoToApplications = async (page: Page) => {
  await page.goto(PATH_APPLICATIONS);
  await expect(page.getByRole('main').getByText('My Applications')).toBeVisible();
  await expect(page.getByTestId('application-table')).toBeVisible();
};

/**
 * Add a new application via UI
 * @param page - Playwright page
 * @param appData - Application data
 */
export const uiAddApplication = async (page: Page, appData: {
  name: string;
  desc?: string;
  label?: { key: string; value: string };
  labels?: { key: string; value: string }[];
}) => {
  const addBtn = page.getByRole('button', { name: 'Add Application' });
  await addBtn.click();

  const addTitle = page.getByRole('dialog').getByText('Add Application', { exact: true });
  await expect(addTitle).toBeVisible();

  // Fill basic info
  await page.locator('input#name').fill(appData.name);
  if (appData.desc) {
    await page.locator('textarea#desc').fill(appData.desc);
  }

  // Add labels if provided
  if (appData.labels || appData.label) {
    const labels = appData.labels || [appData.label];
    for (let i = 0; i < labels.length; i++) {
      await page.getByRole('button', { name: 'plus Add' }).click();
      await page.locator(`#labels_${i}_key`).fill(labels[i].key);
      await page.locator(`#labels_${i}_value`).fill(labels[i].value);
    }
  }

  // Submit
  const addSubmit = page.getByRole('button', { name: 'Add', exact: true });
  await addSubmit.click();

  await uiVerifyToast(page, {
    hasText: 'Add Application Successfully',
  });
};

/**
 * Delete an application via UI
 * @param page - Playwright page
 * @param applicationName - Name of the application to delete
 */
export const uiDeleteApplicationInList = async (page: Page, applicationName: string) => {
  const nameCell = page.getByRole('cell', {
    name: applicationName,
    exact: true,
  });
  await expect(nameCell).toBeVisible();

  const row = nameCell.locator('xpath=..');
  const moreMenuBtn = row.getByTestId('more');
  await moreMenuBtn.click();

  const deleteBtn = page.getByRole('menuitem', { name: 'Delete' });
  await deleteBtn.click();

  const deleteTitle = page.getByText('Delete Application', { exact: true });
  await expect(deleteTitle).toBeVisible();

  // Fill confirmation input
  const confirmInput = page.getByPlaceholder(applicationName);
  await confirmInput.fill(applicationName);

  const confirmBtn = page.getByRole('button', { name: 'Confirm' });
  await confirmBtn.click();

  await uiVerifyToast(page, {
    hasText: 'Delete Application Successfully',
  });
};
