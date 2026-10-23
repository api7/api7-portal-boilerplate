import { type Browser, type Page, expect, test } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';

import { E2E_TARGET_URL } from '../constant';
import { type Ctx, createOrganization, genCtx, login } from '../req/common';
import { uiGetMoreOptionsButton, uiVerifyToast } from '../utils/ui';

// Better Auth's own messages for the two only-owner rejections.
const ONLY_OWNER_LEAVE_MESSAGE =
  'You cannot leave the organization as the only owner';
const ONLY_OWNER_DEMOTE_MESSAGE =
  'You cannot leave the organization without an owner';

type Account = { email: string; password: string; name: string };
type Organization = { id: string; slug: string };

const createAccount = (prefix: string): Account => {
  const id = `${prefix}-${Date.now()}`;
  return {
    email: `${id}@test.example.com`,
    password: `Password3412.${id}`,
    name: id,
  };
};

const signIn = async (account: Account) => {
  const ctx = await genCtx();
  await login(ctx, account);
  return ctx;
};

const addMember = async (
  ownerCtx: Ctx,
  organization: Organization,
  account: Account,
) => {
  const memberCtx = await signIn(account);
  const inviteRes = await ownerCtx.post(
    `${AUTH_BASE_PATH}/organization/invite-member`,
    {
      data: {
        email: account.email,
        role: 'member',
        organizationId: organization.id,
      },
      failOnStatusCode: false,
    },
  );
  expect(inviteRes.status()).toBe(200);
  const invitation = (await inviteRes.json()) as { id: string };
  const acceptRes = await memberCtx.post(
    `${AUTH_BASE_PATH}/organization/accept-invitation`,
    { data: { invitationId: invitation.id }, failOnStatusCode: false },
  );
  expect(acceptRes.status()).toBe(200);
  return memberCtx;
};

const listOrganizationIds = async (ctx: Ctx) => {
  const res = await ctx.get(`${AUTH_BASE_PATH}/organization/list`, {
    failOnStatusCode: false,
  });
  expect(res.status()).toBe(200);
  return ((await res.json()) as Array<{ id: string }>).map((org) => org.id);
};

const openPage = async (browser: Browser, ctx: Ctx) => {
  const context = await browser.newContext({
    baseURL: E2E_TARGET_URL,
    storageState: await ctx.storageState(),
  });
  return context.newPage();
};

const gotoMembers = async (page: Page, organization: Organization) => {
  await page.goto(`/${organization.slug}/members`);
  // Opening a dropdown before the permission checks settle can lose the click.
  await page.waitForLoadState('networkidle');
};

const rowByEmail = (page: Page, email: string) =>
  page.getByRole('row').filter({ hasText: email });

const confirmLeave = (page: Page) =>
  page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Leave organization' })
    .click();

const errorToast = (page: Page) =>
  page.locator('[data-sonner-toast][data-type="error"]');

test.describe('Organization only owner', () => {
  let owner: Account;
  let ownerCtx: Ctx;
  let organization: Organization;

  test.beforeEach(async () => {
    owner = createAccount('only-owner');
    ownerCtx = await signIn(owner);
    organization = await createOrganization(ownerCtx, `${owner.name}-org`);
  });

  test.afterEach(async () => {
    await ownerCtx.dispose();
  });

  test('leaving from the members page shows the server reason', async ({
    browser,
  }) => {
    const page = await openPage(browser, ownerCtx);
    await gotoMembers(page, organization);

    await uiGetMoreOptionsButton(rowByEmail(page, owner.email)).click();
    await page.getByRole('menuitem', { name: 'Leave organization' }).click();
    await confirmLeave(page);
    await expect(errorToast(page)).toContainText(ONLY_OWNER_LEAVE_MESSAGE);

    await expect(page).toHaveURL(new RegExp(`/${organization.slug}/members$`));
    expect(await listOrganizationIds(ownerCtx)).toContain(organization.id);

    await page.context().close();
  });

  test('stepping down from the members page shows the server reason', async ({
    browser,
  }) => {
    const page = await openPage(browser, ownerCtx);
    await gotoMembers(page, organization);

    const row = rowByEmail(page, owner.email);
    await row.getByRole('button', { name: 'Change role' }).click();
    await page.getByRole('menuitem', { name: 'Member' }).click();
    await expect(errorToast(page)).toContainText(ONLY_OWNER_DEMOTE_MESSAGE);
    await expect(row).toContainText('owner');

    await page.context().close();
  });

  test('the owner can leave once a second owner exists', async ({
    browser,
  }) => {
    const member = createAccount('only-owner-second');
    const memberCtx = await addMember(ownerCtx, organization, member);

    const page = await openPage(browser, ownerCtx);
    await gotoMembers(page, organization);

    const memberRow = rowByEmail(page, member.email);
    await memberRow.getByRole('button', { name: 'Change role' }).click();
    await page.getByRole('menuitem', { name: 'Owner' }).click();
    await uiVerifyToast(page, { hasText: 'Member role updated' });
    await expect(memberRow).toContainText('owner');

    await uiGetMoreOptionsButton(rowByEmail(page, owner.email)).click();
    await page.getByRole('menuitem', { name: 'Leave organization' }).click();
    await confirmLeave(page);
    await uiVerifyToast(page, { hasText: 'You left the organization' });

    expect(await listOrganizationIds(ownerCtx)).not.toContain(organization.id);

    await page.context().close();
    await memberCtx.dispose();
  });

  test('leaving from the settings page shows the server reason', async ({
    browser,
  }) => {
    const page = await openPage(browser, ownerCtx);
    await page.goto(`/${organization.slug}/settings`);

    await page.getByRole('button', { name: 'Leave organization' }).click();
    await confirmLeave(page);
    await expect(errorToast(page)).toContainText(ONLY_OWNER_LEAVE_MESSAGE);

    expect(await listOrganizationIds(ownerCtx)).toContain(organization.id);

    await page.context().close();
  });
});
