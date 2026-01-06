import { expect, Locator, Page } from '@playwright/test';
import { PROVIDER_UI_PREFIX, PROVIDER_UI_ROOT_PATH } from '../constant';
import { httpbinRawOAS } from '../req/dashboard/product';
import type { ProductVisibility } from '@site/types/portal-sdk';
import { isString } from 'lodash';
import { A7Ctx, a7DefaultPortalID } from '../req/dashboard/common';

export const a7UIVerifyToast = async (
  a7UIPage: Page,
  ...params: Parameters<Locator['filter']>
) => {
  const toast = a7UIPage
    .locator('.chakra-portal .chakra-toast .chakra-alert__title')
    .filter(...params);
  await expect(toast).toBeVisible();
  const closeBtns = await toast.getByLabel('Close').all();
  closeBtns.forEach((v) => v.click({ force: true }));
};
type LocatorOptions = Parameters<Page['locator']>['1'];
export const a7UIVerifyDesc = async (
  a7UIPage: Page,
  label: string | LocatorOptions,
  content: string | LocatorOptions
) => {
  await expect(
    a7UIPage
      .locator(
        '.ant-descriptions-item-label',
        isString(label) ? { hasText: label } : label
      )
      .locator(
        'xpath=following-sibling::*[1]',
        isString(content) ? { hasText: content } : content
      )
  ).toBeVisible();
};

export const a7UISelectVerify = async (
  a7UIPage: Page,
  { target, isFullMatch = true, exist = true }
) => {
  const regexStr = `^${target}$`;
  const locator = a7UIPage.locator('[class$="-singleValue"]', {
    hasText: isFullMatch ? new RegExp(regexStr) : target,
  });
  await locator.waitFor({ state: exist ? 'visible' : 'hidden' });
};

export const a7UISelect = async (
  a7UIPage: Page,
  { name, target, isFullMatch = true }
) => {
  const s = `[data-cy="${name}"]`;
  await a7UIPage.locator(s).click();

  const l = a7UIPage.locator(`[data-cy="${name}"]`);
  const regexStr = `^${target}$`;
  const hasText = isFullMatch ? new RegExp(regexStr) : target;
  await l.locator('button', { hasText }).click();
  await a7UISelectVerify(a7UIPage, { target, isFullMatch });
};

export const a7UICreateExternalProduct = async (
  a7UIPage: Page,
  product = 'httpbin',
  visibility: ProductVisibility = 'public',
  a7Ctx: A7Ctx
) => {
  const portalID = await a7DefaultPortalID(a7Ctx)
  await a7UIPage.goto(`${PROVIDER_UI_PREFIX}/${portalID}/exposure/products`);
  await a7UIPage.getByRole('button', { name: 'Add API Product' }).click();
  const importOpenAPI = a7UIPage.getByRole('menuitem', {
    name: 'Import OpenAPI',
  });
  await expect(importOpenAPI).toBeVisible();
  await importOpenAPI.click();
  const header = a7UIPage.locator('.chakra-modal__header', {
    hasText: 'Add API Product',
  });
  await expect(header).toBeVisible();
  await a7UIPage.setInputFiles("[data-cy='openapi-spec']", {
    name: product,
    mimeType: 'application/yaml',
    buffer: Buffer.from(
      httpbinRawOAS.replace('title: httpbin', `title: ${product}`)
    ),
  });
  const visibilityText =
    visibility === 'public' ? 'Visible to all' : 'Visible to logged-in';
  await a7UIPage.locator('label').filter({ hasText: visibilityText }).click();

  await a7UIPage
    .locator('.chakra-modal__footer button', { hasText: 'Add' })
    .click();
  await a7UIVerifyToast(a7UIPage, {
    hasText: 'Add API Product Successfully',
  });
  await expect(
    a7UIPage.locator('.chakra-text', { hasText: product })
  ).toBeVisible();
  // check visible
  await a7UIPage.getByRole('tab', { name: 'Visibility' }).click();
  await a7UIVerifyDesc(a7UIPage, 'API Hub List Visibility', visibilityText);
  // get id
  const productId = new URL(a7UIPage.url()).pathname.split('/').pop();

  // go back
  await a7UIPage.goto(`${PROVIDER_UI_PREFIX}/${portalID}/exposure/products`);
  // should see product is draft
  const card = a7UIPage.locator(`[data-cy="${product}"]`);
  await expect(card.getByText('Draft')).toBeVisible();
  await card.locator('[data-cy="more"]').click();

  await a7UIPage.getByRole('menuitem', { name: 'Publish' }).click();
  await expect(
    a7UIPage.locator('.chakra-modal__header', {
      hasText: 'Publish API Product',
    })
  ).toBeVisible();
  await a7UIPage.getByPlaceholder(product).clear();
  await a7UIPage.getByPlaceholder(product).fill(product);
  await a7UIPage
    .locator('.chakra-modal__footer button', { hasText: 'Confirm' })
    .click();
  const published = a7UIPage.locator(`[data-cy="${product}"]`, {
    hasText: 'Published',
  });
  await expect(published).toBeVisible();
  // return product id
  return productId;
};

export const a7UICreateGatewayProduct = async (
  a7UIPage: Page,
  product = 'httpbin',
  gatewayGroupName = 'httpbin',
  service: string,
  visibility: ProductVisibility = 'public',
  can_view_unsubscribed = false,
  a7Ctx: A7Ctx,
  authType: 'key-auth' | 'basic-auth' | 'dcr' = 'key-auth',
  dcrName?: string,
  host?: string,
) => {
  const portalID = await a7DefaultPortalID(a7Ctx)
  await a7UIPage.goto(PROVIDER_UI_PREFIX);
  await a7UIPage.waitForURL('**/overview*');
  const APIProductMenu = a7UIPage.locator('#menu-item-APIExposure').getByText('API Products');
  await expect(APIProductMenu).toBeVisible();
  await APIProductMenu.click();
  await a7UIPage.getByRole('button', { name: 'Add API Product' }).click();
  const fromAPI7Gateway = a7UIPage.getByRole('menuitem', {
    name: 'From API7 Gateway',
  });
  await expect(fromAPI7Gateway).toBeVisible();
  await fromAPI7Gateway.click();
  await a7UIPage.waitForURL(/.*\/add/);
  await a7UIPage.waitForResponse(response =>
    response.url().includes('/api/dcr_providers?') && response.status() === 200
  );
  await a7UIPage.locator('[name="name"]').fill(product);
  await expect(a7UIPage.locator('[data-cy="create-product"]')).toBeDisabled();
  await a7UIPage
    .locator('[name="subscription_auto_approval"]')
    .locator('xpath=..')
    .click();

  if (authType === 'key-auth') {
    await a7UIPage
      .locator('label')
      .filter({ hasText: 'Key Authentication' })
      .click();
  } else if (authType === 'basic-auth') {
    await a7UIPage
      .locator('label')
      .filter({ hasText: 'Basic Authentication' })
      .click();
  } else if (authType === 'dcr') {
    await a7UIPage.locator('label:has(input[value="dcr"])').click();
    await a7UIPage.waitForTimeout(4000);
    await a7UISelect(a7UIPage, {
      name: '__dcr_provider_id',
      target: dcrName,
    });
  }

  const visibilityText =
    visibility === 'public' ? 'Visible to all' : 'Visible to logged-in';
  await a7UIPage.locator('label').filter({ hasText: visibilityText }).click();

  // default can_view_unsubscribed is true
  await expect(
    a7UIPage.locator('[name="can_view_unsubscribed"]')
  ).toBeChecked();
  // if can_view_unsubscribed is false, uncheck it
  if (!can_view_unsubscribed) {
    await a7UIPage
      .locator('[name="can_view_unsubscribed"]')
      .locator('xpath=..')
      .click();
  }
  // click add linked service
  await a7UIPage
    .getByRole('button', { name: 'Add Linked Gateway Service' })
    .click();
  // handle in drawer
  const drawer = a7UIPage.locator('.ant-drawer-content');
  await expect(drawer.getByText('Add Linked Gateway Service')).toBeVisible();
  await a7UISelect(a7UIPage, {
    name: 'gatewayGroupId',
    target: gatewayGroupName,
  });
  await drawer.locator('.lazy-load-select input').fill(service);
  await a7UIPage.getByText(`${service} (No Version)`, { exact: true }).click();
  if (host) {
    await a7UIPage.locator('[data-cy="linked_hosts"]').click();
    await a7UIPage.locator(`[data-cy="select-option-${host}"]`).click();
  }
  await drawer.getByRole('button', { name: 'Add' }).click();
  await a7UIPage.waitForTimeout(1000);
  await expect(drawer).toBeHidden();
  // should see service in list
  await expect(a7UIPage.locator('td', { hasText: service })).toBeVisible();

  await a7UIPage.locator('[data-cy="create-product"]').click();
  await a7UIVerifyToast(a7UIPage, {
    hasText: 'Add API Product Successfully',
  });
  await expect(
    a7UIPage.getByText(product, { exact: true } ).first()
  ).toBeVisible();
  // check visible
  await a7UIPage.getByRole('tab', { name: 'Visibility' }).click();
  await a7UIVerifyDesc(a7UIPage, 'API Hub List Visibility', visibilityText);
  // get id
  const productId = new URL(a7UIPage.url()).pathname.split('/').pop();

  // go back
  await a7UIPage.goto(`${PROVIDER_UI_PREFIX}/${portalID}/exposure/products`);

  // should see product is draft
  const card = a7UIPage.locator(`[data-cy="${product}"]`);
  await expect(card.getByText('Draft')).toBeVisible();
  await card.locator('[data-cy="more"]').click();

  await a7UIPage.getByRole('menuitem', { name: 'Publish' }).click();
  await expect(
    a7UIPage.locator('.chakra-modal__header', {
      hasText: 'Publish API Product',
    })
  ).toBeVisible();
  await a7UIPage.getByPlaceholder(product).clear();
  await a7UIPage.getByPlaceholder(product).fill(product);
  await a7UIPage
    .locator('.chakra-modal__footer button', { hasText: 'Confirm' })
    .click();
  const published = a7UIPage.locator(`[data-cy="${product}"]`, {
    hasText: 'Published',
  });
  await expect(published).toBeVisible();
  // return product id
  return productId;
};
export const a7UIChangeProductVisibility = async (
  a7UIPage: Page,
  productId: string,
  visibility: ProductVisibility = 'public',
  canViewUnsubscribed = false,
  a7Ctx: A7Ctx
) => {
  const portalID = await a7DefaultPortalID(a7Ctx)
  await a7UIPage.goto(`/portals/${portalID}/exposure/products/${productId}`);
  await expect(a7UIPage.getByText('Linked Gateway Services')).toBeVisible();
  await a7UIPage.getByRole('tab', { name: 'Visibility' }).click();
  await a7UIPage.locator('[data-cy="edit-visibility"]').click();
  const drawer = a7UIPage.locator('.ant-drawer-content', {
    hasText: 'Edit Visibility',
  });
  await expect(drawer).toBeVisible();
  // click to change visibility
  const visibilityText =
    visibility === 'public' ? 'Visible to all' : 'Visible to logged-in';
  await drawer.locator('label').filter({ hasText: visibilityText }).click();
  // click to change can_view_unsubscribed
  const canViewUnsubscribedLabel = drawer
    .locator('[name="can_view_unsubscribed"]')
    .locator('xpath=..');
  const isChecked = await canViewUnsubscribedLabel.isChecked();
  // if not equal to expected value, click it
  if (isChecked !== canViewUnsubscribed) {
    await canViewUnsubscribedLabel.click();
  }
  // save
  await drawer.getByRole('button', { name: 'Save', exact: true }).click();
  // wait drawer not exist
  await expect(drawer).toBeHidden();
  // check visibility
  await a7UIVerifyDesc(a7UIPage, 'API Hub List Visibility', visibilityText);
  // check can_view_unsubscribed
  await a7UIVerifyDesc(
    a7UIPage,
    'Unsubscribed developers can view API details',
    {
      has: canViewUnsubscribed
        ? a7UIPage.locator('label[data-disabled][data-checked]')
        : a7UIPage.locator('label[data-disabled]:not([data-checked])'),
    }
  );
};
export const a7UIChangeProductAutoApproval = async (
  a7UIPage: Page,
  productId: string,
  autoApproval: boolean
) => {
  await a7UIPage.goto(`${PROVIDER_UI_ROOT_PATH}/${productId}`);
  await expect(a7UIPage.getByText('Linked Gateway Services')).toBeVisible();
  await a7UIPage.getByRole('tab', { name: 'Authentication' }).click();
  await a7UIPage.locator('[data-cy="edit-authentication"]').click();
  const drawer = a7UIPage.locator('.ant-drawer-content', {
    hasText: 'Edit Authentication',
  });
  await expect(drawer).toBeVisible();

  // click to change subscription_auto_approval
  const autoApprovalLabel = drawer
    .locator('[name="subscription_auto_approval"]')
    .locator('xpath=..');
  const isChecked = await autoApprovalLabel.isChecked();
  // if not equal to expected value, click it
  if (isChecked !== autoApproval) {
    await autoApprovalLabel.click();
  }
  // save
  await drawer.getByRole('button', { name: 'Save', exact: true }).click();
  // wait drawer not exist
  await expect(drawer).toBeHidden();
  // check subscription_auto_approval
  await a7UIVerifyDesc(a7UIPage, 'Subscription Auto Approval', {
    has: autoApproval
      ? a7UIPage.locator('label[data-disabled][data-checked]')
      : a7UIPage.locator('label[data-disabled]:not([data-checked])'),
  });
};

export const a7UIGetAction = async (
  a7UIPage: Page,
  options: Parameters<Page['locator']>['1']
) => {
  await a7UIPage
    .locator('.chakra-menu__menu-button', { hasText: 'Actions' })
    .click();
  return a7UIPage.locator('.chakra-menu__menuitem', options);
};


export const a7UICreateDCR = async (
  a7UIPage: Page,
  dcrData: {
    name: string,
    description: string,
    issuer: string,
    auth_headers_key: string,
    auth_headers_value: string,
  }) => {
  const { name, description, issuer, auth_headers_key, auth_headers_value } = dcrData;
  await a7UIPage.goto('/dcr_providers');
  await a7UIPage.getByRole('button', { name: 'Add DCR Provider' }).click();
  await a7UIPage.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await a7UIPage.getByLabel('Description').fill(description);
  await a7UIPage.getByRole('textbox', { name: 'Issuer' }).fill(issuer);
  await a7UIPage.getByRole('group').locator('div').filter({ hasText: 'Auth headers (Optional)Add' }).getByRole('button').click();
  await a7UIPage.locator('[name="headers.0.key"]').fill(auth_headers_key);
  await a7UIPage.locator('[name="headers.0.value"]').fill(auth_headers_value);
  await a7UIPage.locator('.ant-drawer-footer').locator('button', { hasText: 'Add' }).click();
  await a7UIVerifyToast(a7UIPage, {
    hasText: 'Add DCR Provider Successfully',
  });
};
