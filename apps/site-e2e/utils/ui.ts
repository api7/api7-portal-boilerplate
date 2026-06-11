import { Locator, Page, expect } from '@playwright/test';
import { RESERVED_FIRST_SEGMENTS } from '@site/constants/common';
import {
  PATH_API_HUB,
  PATH_APPLICATIONS,
  PATH_LOGIN,
} from '@site/constants/path-prefix';

import { getDefaultApplicationId } from '../req/common';
import { getLastEmail } from '../req/email';
import { BetterAuthLogin } from '../req/type';

export const getOrgScopedPath = (page: Page, path: string) => {
  const pathname = new URL(page.url()).pathname;
  const firstSegment = pathname.split('/').filter(Boolean)[0];

  if (!firstSegment || RESERVED_FIRST_SEGMENTS.has(firstSegment)) {
    return path;
  }

  return `/${firstSegment}${path}`;
};

export const uiGetMoreOptionsButton = (row: Locator) =>
  row.locator('button[aria-label="More Options"]').first();

export const uiClickCellButton = async (cell: Locator, name?: string) => {
  const button = name
    ? cell.getByRole('button', { name }).first()
    : cell.getByRole('button').first();
  await expect(button).toBeVisible();
  await button.click();
};

export const uiSelectComboboxItem = async (
  page: Page,
  container: Locator,
  optionText: string,
) => {
  const combobox = container.locator('[data-slot="combobox-chips"]').first();
  await expect(combobox).toBeVisible();

  // Focus the input inside the chips to open the popup. base-ui Combobox opens
  // the dropdown on input focus; clicking the outer chips shell may not trigger it.
  // Use fill() so Playwright focuses the element and dispatches focus events that
  // base-ui listens to, then type the option text to filter the list and ensure
  // the popup renders matching items.
  const chipInput = combobox
    .locator('[data-slot="combobox-chip-input"]')
    .first();
  if (await chipInput.isVisible().catch(() => false)) {
    // fill() focuses the input which opens the popup, then filters items by text
    await chipInput.fill(optionText);
    const option = page
      .locator('[data-slot="combobox-item"]')
      .filter({ hasText: optionText })
      .first();
    await expect(option).toBeVisible({ timeout: 10_000 });
    // Use keyboard to select: page overlays (e.g. BareBlurPlaneButton z-100) can
    // block mouse clicks on the portal-rendered popup (z-50), but keyboard events
    // sent to the focused input are unaffected.
    await chipInput.press('ArrowDown');
    await chipInput.press('Enter');
  } else {
    await combobox.click({ force: true });
    const option = page
      .locator('[data-slot="combobox-item"]')
      .filter({ hasText: optionText })
      .first();
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click({ force: true });
  }
};

export const uiGetOAuthAlert = (page: Page, title: string) =>
  page.getByRole('alert').filter({ hasText: title });

export const uiGetOAuthAlertInput = (page: Page, label: string) =>
  page
    .locator('[data-slot="input-group"]')
    .filter({ hasText: label })
    .locator('input')
    .first();

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
  { onetime = false, goToLogin = false, assertAccount = true } = {},
) => {
  if (goToLogin) await page.goto(PATH_LOGIN);
  // Wait for React hydration to complete before interacting with the form.
  // The sign-in form is SSR'd; hydration briefly detaches DOM elements.
  await page.waitForLoadState('networkidle');
  await page.getByRole('textbox', { name: 'Email' }).fill(auth.email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(auth.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  if (!assertAccount) return;
  await page.getByRole('button', { name: 'Account' }).click();
  await expect(page.getByRole('menuitem', { name: /sign out/i })).toBeVisible();
  // click to close user menu
  await page.locator('html').click();
};
export const uiLogout = async (page: Page) => {
  const accountBtn = page.getByRole('button', { name: 'Account' });
  await accountBtn.click();
  await page.getByRole('menuitem', { name: /sign out/i }).click();

  // Ensure deterministic sign-out state for tests even when UI redirect is flaky.
  await page.context().clearCookies();
  await page.goto(PATH_LOGIN);
  await expect(
    page.getByRole('button', { name: 'Continue' }),
  ).toBeVisible({
    timeout: 10_000,
  });
};

export const uiDeleteCredential = async (page: Page, nameCell: Locator) => {
  // Read the name before opening modal: aria-modal="true" on dialog hides
  // background elements from the accessibility tree, making nameCell unreachable.
  const confirmText = await nameCell.innerText();
  const row = nameCell.locator('xpath=ancestor::tr[1]');
  const moreMenuBtn = uiGetMoreOptionsButton(row);

  await expect(moreMenuBtn).toBeVisible();
  await moreMenuBtn.click();
  const deleteBtn = page.getByRole('menuitem', {
    name: 'Delete',
  });
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();
  // delete modal should show
  const deleteTitle = page.getByText('Delete Credential', { exact: true });
  await expect(deleteTitle).toBeVisible();
  // scope button to the dialog so we don't accidentally find other Save buttons
  const deleteDialog = page.getByRole('dialog', { name: 'Delete Credential' });
  const confirmBtn = deleteDialog.getByRole('button', { name: 'Save' });
  await expect(confirmBtn).toBeDisabled();
  // fill confirm input
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
  params: uiSubscribeProductProductParams,
) => {
  const { productName } = params;
  // Subscribe to auto approval product
  await page
    .getByRole('button', { name: 'Subscribe to New API Product' })
    .click();
  const modal = page.getByRole('dialog', {
    name: 'Subscribe to New API Product',
  });
  await expect(modal.getByText('API Product', { exact: true })).toBeVisible();
  await uiSelectComboboxItem(page, modal, productName);
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
export const uiSubscribeProductApplication = async (
  page: Page,
  params: UISubscribeProductApplicationParams,
) => {
  const { applicationName } = params;
  const dialog = page.getByRole('dialog', {
    name: 'Subscribe Application to API Product',
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Applications', { exact: true })).toBeVisible();
  await uiSelectComboboxItem(page, dialog, applicationName);
  // close dropdown (force: true — BareBlurPlaneButton overlay with z-100 may
  // intercept pointer events on the dialog title)
  await dialog
    .getByText('Subscribe Application to API Product')
    .click({ force: true });
  const confirmSubscribeBtn = dialog.getByRole('button', {
    name: 'Subscribe',
    exact: true,
  });
  await expect(confirmSubscribeBtn).toBeEnabled();
  // force: true — BareBlurPlaneButton (z-100) sits above the dialog (z-50)
  // and intercepts pointer events; the button itself is functional.
  await confirmSubscribeBtn.click({ force: true });
  await uiVerifyToast(page, {
    hasText: 'Subscribe Application to API Product Successfully',
  });
};

type UISubscribeProductParams = {
  productId: string;
} & UISubscribeProductApplicationParams;
export const uiSubscribeProductInAPIHub = async (
  page: Page,
  params: UISubscribeProductParams,
) => {
  const { applicationName, productId } = params;

  await page.waitForTimeout(1000);
  // Navigate to /applications first — server redirects to /{slug}/applications,
  // so getOrgScopedPath can resolve the correct org-scoped api-hub base path.
  await page.goto(PATH_APPLICATIONS, { waitUntil: 'domcontentloaded' });
  const resolvedApiHubBasePath = getOrgScopedPath(page, PATH_API_HUB);

  await page.goto(`${resolvedApiHubBasePath}/${productId}`, {
    waitUntil: 'domcontentloaded',
  });
  const subscriptionsTab = page.getByRole('tab', { name: 'Subscriptions' });
  const loginButton = page.getByRole('button', { name: 'Continue' });

  await Promise.race([
    subscriptionsTab.waitFor({ state: 'visible', timeout: 20000 }),
    loginButton.waitFor({ state: 'visible', timeout: 20000 }).then(() => {
      throw new Error(
        `Expected authenticated API Hub detail page, but got login screen: ${page.url()}`,
      );
    }),
  ]);

  await subscriptionsTab.click({ timeout: 15000 });
  const subscribeBtn = page.getByRole('button', {
    name: 'Subscribe to Application',
  });
  await expect(subscribeBtn).toBeVisible();
  await expect(subscribeBtn).toBeEnabled();
  await subscribeBtn.click();
  await uiSubscribeProductApplication(page, { applicationName });
};

export const uiUnsubscribeProductInAPIHub = async (
  page: Page,
  params: UISubscribeProductParams,
) => {
  const { applicationName, productId } = params;
  await page.goto(PATH_APPLICATIONS, { waitUntil: 'domcontentloaded' });
  const resolvedApiHubBasePath = getOrgScopedPath(page, PATH_API_HUB);
  await page.goto(`${resolvedApiHubBasePath}/${productId}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('tab', { name: 'Subscriptions' }).click();
  const row = page
    .getByRole('cell', { name: applicationName })
    .locator('xpath=..');
  const moreMenuBtn = uiGetMoreOptionsButton(row);
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
  const confirmBtn = page.getByRole('button', { name: 'Save' });
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
  const loginBtn = page.getByRole('button', { name: 'Continue' });
  await expect(loginBtn).toBeVisible({ timeout: 10_000 });
};
export const uiAPIHubSearchProduct = async (
  page: Page,
  productName: string,
) => {
  await page.goto(getOrgScopedPath(page, PATH_API_HUB));
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

  if (await defaultApp.isVisible().catch(() => false)) {
    await defaultApp
      .locator('a[href*="/applications/"]')
      .first()
      .click();
  } else {
    // Some test flows may remove/recreate applications; recover deterministically.
    const appRows = page.getByTestId('application-table').locator('tbody tr');
    if ((await appRows.count()) === 0) {
      await uiAddApplication(page, { name: 'default' });
      const createdDefaultApp = page.getByRole('cell', {
        name: 'default',
        exact: true,
      });
      await expect(createdDefaultApp).toBeVisible();
      await createdDefaultApp
        .locator('a[href*="/applications/"]')
        .first()
        .click();
    } else {
      const firstAppLink = appRows.first().getByRole('link').first();
      if (await firstAppLink.isVisible().catch(() => false)) {
        await firstAppLink.click();
      } else {
        await uiAddApplication(page, { name: 'default' });
        const createdDefaultApp = page.getByRole('cell', {
          name: 'default',
          exact: true,
        });
        await expect(createdDefaultApp).toBeVisible();
        await createdDefaultApp
          .locator('a[href*="/applications/"]')
          .first()
          .click();
      }
    }
  }

  await page.waitForURL(new RegExp(`${PATH_APPLICATIONS}/[^/]+$`));
};

/**
 * Go to Authentication Type page
 * @param page - Playwright page
 * @param applicationId - Application ID (optional, will find 'default' app if not provided)
 */
export const uiGoToAPICredentials = async (
  page: Page,
  applicationId?: string,
) => {
  if (applicationId) {
    // If the current page already has an org slug, preserve it; otherwise
    // navigate to /applications first to let the server redirect add the slug.
    const scoped = getOrgScopedPath(page, `${PATH_APPLICATIONS}/${applicationId}`);
    if (scoped !== `${PATH_APPLICATIONS}/${applicationId}`) {
      await page.goto(scoped);
    } else {
      await page.goto(PATH_APPLICATIONS, { waitUntil: 'domcontentloaded' });
      await page.goto(getOrgScopedPath(page, `${PATH_APPLICATIONS}/${applicationId}`));
    }
  } else {
    try {
      // Navigate to /applications — server redirects to /{slug}/applications,
      // giving us the org slug needed for the portal API call.
      await page.goto(PATH_APPLICATIONS, { waitUntil: 'domcontentloaded' });
      const orgSlug = getOrgScopedPath(page, '').replace(/^\/|\/$/g, '') || undefined;
      const appId = await getDefaultApplicationId(page.request, orgSlug);
      await page.goto(getOrgScopedPath(page, `${PATH_APPLICATIONS}/${appId}`));
    } catch {
      await uiOpenDefaultApplicationDetail(page);
    }
  }
  await page.getByRole('tab', { name: 'Authentication Type' }).click();
};
export const uiAddAPIKeyCredential = async (
  page: Page,
  name = 'default-key-auth',
) => {
  await uiGoToAPICredentials(page);
  // Skip creation if credential already exists (e.g. from a previous retry)
  const existingCell = page.getByRole('cell', { name }).first();
  if (await existingCell.isVisible().catch(() => false)) {
    return;
  }
  const button = page.locator(
    'button:has-text("Add Key Authentication Credential")',
  );
  await button.click();
  await page.locator('#name').fill(name);
  await page
    .getByTestId('drawer-footer')
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
  name = 'default-key-auth',
) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await uiGoToAPICredentials(page);
  // should exist default key auth (use .first() to handle duplicate rows from retries)
  const nameCell = page.getByRole('cell', { name }).first();
  await expect(nameCell).toBeVisible();
  const row = nameCell.locator('xpath=ancestor::tr[1]');

  // The key is view-once and is not shown after creation. Regenerate it to
  // reveal a fresh key, which is surfaced once in a copyable alert.
  const moreMenuBtn = uiGetMoreOptionsButton(row);
  await expect(moreMenuBtn).toBeVisible();
  await moreMenuBtn.click();
  await page.getByRole('menuitem', { name: 'Rotate' }).click();
  // ValidateModal requires typing the credential name to confirm.
  await page.getByPlaceholder(name).fill(name);
  await page.getByRole('button', { name: 'Confirm' }).click();

  // The regenerated key is revealed once in an alert with a copy button.
  const copyBtn = page.getByRole('button', { name: 'Copy' }).first();
  await expect(copyBtn).toBeVisible();
  await copyBtn.click();
  await expect
    .poll(async () => page.evaluate(() => navigator.clipboard.readText()), {
      timeout: 5000,
    })
    .not.toBe('');

  return page.evaluate(() => navigator.clipboard.readText());
};
/**
 * Navigate to Applications list page
 * @param page - Playwright page
 */
export const uiGoToApplications = async (page: Page) => {
  await page.goto(getOrgScopedPath(page, PATH_APPLICATIONS), {
    waitUntil: 'domcontentloaded',
  });
  const table = page.getByTestId('application-table');
  if (await table.isVisible().catch(() => false)) {
    return;
  }

  const myApplicationsLink = page.getByRole('link', {
    name: 'My Applications',
  });
  if (await myApplicationsLink.isVisible().catch(() => false)) {
    await myApplicationsLink.click();
  } else {
    await page.goto(PATH_APPLICATIONS, { waitUntil: 'domcontentloaded' });
  }
  await expect(table).toBeVisible();
};

/**
 * Add a new application via UI
 * @param page - Playwright page
 * @param appData - Application data
 */
export const uiAddApplication = async (
  page: Page,
  appData: {
    name: string;
    desc?: string;
    label?: { key: string; value: string };
    labels?: { key: string; value: string }[];
  },
) => {
  const addBtn = page.getByRole('button', { name: 'Add Application' });
  await addBtn.click();

  const addTitle = page
    .getByRole('dialog')
    .getByText('Add Application', { exact: true });
  await expect(addTitle).toBeVisible();

  // Fill basic info
  await page.locator('input#name').fill(appData.name);
  if (appData.desc) {
    await page.locator('textarea#desc').fill(appData.desc);
  }

  // Add labels if provided
  if (appData.labels || appData.label) {
    const labels = appData.labels ?? (appData.label ? [appData.label] : []);
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      if (!label) {
        continue;
      }
      await page.getByTestId('add-label-btn').click();
      await page.locator(`#labels_${i}_key`).fill(label.key);
      await page.locator(`#labels_${i}_value`).fill(label.value);
    }
  }

  // Submit
  const addSubmit = page.getByTestId('drawer-footer').getByRole('button', { name: 'Add', exact: true });
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
export const uiDeleteApplicationInList = async (
  page: Page,
  applicationName: string,
) => {
  const nameCell = page.getByRole('cell', {
    name: applicationName,
    exact: true,
  });
  await expect(nameCell).toBeVisible();

  const row = nameCell.locator('xpath=ancestor::tr[1]');
  const moreMenuBtn = uiGetMoreOptionsButton(row);
  await moreMenuBtn.click();

  const deleteBtn = page.getByRole('menuitem', { name: 'Delete' });
  await deleteBtn.click();

  const deleteTitle = page.getByText('Delete Application', { exact: true });
  await expect(deleteTitle).toBeVisible();

  // Fill confirmation input
  const confirmInput = page.getByPlaceholder(applicationName);
  await confirmInput.fill(applicationName);

  const confirmBtn = page.getByRole('button', { name: 'Save' });
  await confirmBtn.click();

  await uiVerifyToast(page, {
    hasText: 'Delete Application Successfully',
  });
};
