import { type Browser, type Page, expect, test } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';
import { PATH_ACCOUNT_ORGANIZATIONS } from '@site/constants/path-prefix';

import { E2E_TARGET_URL } from '../constant';
import { type Ctx, createOrganization, genCtx, login } from '../req/common';
import { execSQL } from '../utils/shell';
import { uiGetMoreOptionsButton, uiVerifyToast } from '../utils/ui';

const FE_E2E_DB = 'devportal_fe_e2e';

type Account = { email: string; password: string; name: string };
type Organization = { id: string; slug: string };
type Invitation = { id: string; email: string; status: string };

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

const invite = async (
  ownerCtx: Ctx,
  organizationId: string,
  email: string,
): Promise<Invitation> => {
  const res = await ownerCtx.post(
    `${AUTH_BASE_PATH}/organization/invite-member`,
    {
      data: { email, role: 'member', organizationId },
      failOnStatusCode: false,
    },
  );
  expect(res.status()).toBe(200);
  return res.json();
};

const acceptInvitation = (ctx: Ctx, invitationId: string) =>
  ctx.post(`${AUTH_BASE_PATH}/organization/accept-invitation`, {
    data: { invitationId },
    failOnStatusCode: false,
  });

const addMember = async (
  ownerCtx: Ctx,
  organization: Organization,
  account: Account,
) => {
  const memberCtx = await signIn(account);
  const invitation = await invite(ownerCtx, organization.id, account.email);
  expect((await acceptInvitation(memberCtx, invitation.id)).status()).toBe(200);
  const setActiveRes = await memberCtx.post(
    `${AUTH_BASE_PATH}/organization/set-active`,
    { data: { organizationId: organization.id }, failOnStatusCode: false },
  );
  expect(setActiveRes.status()).toBe(200);
  return memberCtx;
};

const listMembers = async (ctx: Ctx, organizationId: string) => {
  const res = await ctx.get(
    `${AUTH_BASE_PATH}/organization/list-members?organizationId=${organizationId}`,
    { failOnStatusCode: false },
  );
  expect(res.status()).toBe(200);
  const body = await res.json();
  return (body.members ?? []) as Array<{
    role: string;
    user: { email: string };
  }>;
};

const listInvitations = async (ctx: Ctx, organizationId: string) => {
  const res = await ctx.get(
    `${AUTH_BASE_PATH}/organization/list-invitations?organizationId=${organizationId}`,
    { failOnStatusCode: false },
  );
  expect(res.status()).toBe(200);
  return (await res.json()) as Invitation[];
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

const selectInvitationStatus = async (page: Page, label: string) => {
  await page.getByRole('button', { name: /^Status/ }).click();
  await page.getByRole('menuitemradio', { name: label }).click();
  await page.keyboard.press('Escape');
};

test.describe('Organization member management', () => {
  let owner: Account;
  let ownerCtx: Ctx;
  let organization: Organization;

  test.beforeEach(async () => {
    owner = createAccount('members-owner');
    ownerCtx = await signIn(owner);
    organization = await createOrganization(ownerCtx, `${owner.name}-org`);
  });

  test.afterEach(async () => {
    await ownerCtx.dispose();
  });

  test('owner can change a member role to admin', async ({ browser }) => {
    const member = createAccount('members-promote');
    const memberCtx = await addMember(ownerCtx, organization, member);

    const page = await openPage(browser, ownerCtx);
    await gotoMembers(page, organization);

    const row = rowByEmail(page, member.email);
    await expect(row).toContainText('member');
    await row.getByRole('button', { name: 'Change role' }).click();
    await page.getByRole('menuitem', { name: 'Admin' }).click();
    await uiVerifyToast(page, { hasText: 'Member role updated' });
    await expect(row).toContainText('admin');

    const members = await listMembers(ownerCtx, organization.id);
    expect(members.find((m) => m.user.email === member.email)?.role).toBe(
      'admin',
    );

    const memberPage = await openPage(browser, memberCtx);
    await gotoMembers(memberPage, organization);
    await expect(
      memberPage.getByRole('button', { name: 'Invite member' }),
    ).toBeEnabled();

    await memberPage.context().close();
    await page.context().close();
    await memberCtx.dispose();
  });

  test('owner can remove a member', async ({ browser }) => {
    const member = createAccount('members-remove');
    const memberCtx = await addMember(ownerCtx, organization, member);

    const page = await openPage(browser, ownerCtx);
    await gotoMembers(page, organization);

    const row = rowByEmail(page, member.email);
    await uiGetMoreOptionsButton(row).click();
    await page.getByRole('menuitem', { name: 'Remove member' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText(member.email);
    await dialog.getByRole('button', { name: 'Remove member' }).click();
    await uiVerifyToast(page, { hasText: 'Member removed' });
    await expect(row).toBeHidden();

    expect(await listOrganizationIds(memberCtx)).not.toContain(organization.id);

    await page.context().close();
    await memberCtx.dispose();
  });

  test('member can leave the organization', async ({ browser }) => {
    const member = createAccount('members-leave');
    const memberCtx = await addMember(ownerCtx, organization, member);

    const page = await openPage(browser, memberCtx);
    await gotoMembers(page, organization);

    const row = rowByEmail(page, member.email);
    await uiGetMoreOptionsButton(row).click();
    await page.getByRole('menuitem', { name: 'Leave organization' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Leave organization' })
      .click();
    await uiVerifyToast(page, { hasText: 'You left the organization' });
    await expect(page).toHaveURL(new RegExp(`${PATH_ACCOUNT_ORGANIZATIONS}$`));

    expect(await listOrganizationIds(memberCtx)).not.toContain(organization.id);
    const members = await listMembers(ownerCtx, organization.id);
    expect(members.map((m) => m.user.email)).not.toContain(member.email);

    await page.context().close();
    await memberCtx.dispose();
  });

  test('the only owner cannot leave the organization', async ({ browser }) => {
    const page = await openPage(browser, ownerCtx);
    await gotoMembers(page, organization);

    await uiGetMoreOptionsButton(rowByEmail(page, owner.email)).click();
    await page.getByRole('menuitem', { name: 'Leave organization' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Leave organization' })
      .click();
    await expect(
      page.locator('[data-sonner-toast][data-type="error"]'),
    ).toBeVisible();

    await expect(page).toHaveURL(new RegExp(`/${organization.slug}/members$`));
    expect(await listOrganizationIds(ownerCtx)).toContain(organization.id);

    await page.context().close();
  });

  test('owner can cancel a pending invitation', async ({ browser }) => {
    const invitee = createAccount('members-cancel');
    const inviteeCtx = await signIn(invitee);
    const invitation = await invite(ownerCtx, organization.id, invitee.email);

    const page = await openPage(browser, ownerCtx);
    await gotoMembers(page, organization);

    const row = rowByEmail(page, invitee.email);
    await expect(row).toContainText('Pending');
    await uiGetMoreOptionsButton(row).click();
    await page.getByRole('menuitem', { name: 'Cancel invitation' }).click();
    await expect(row).toBeHidden();

    await selectInvitationStatus(page, 'Canceled');
    await expect(row).toContainText('Canceled');

    const invitations = await listInvitations(ownerCtx, organization.id);
    expect(invitations.find((i) => i.id === invitation.id)?.status).toBe(
      'canceled',
    );
    expect((await acceptInvitation(inviteeCtx, invitation.id)).status()).toBe(
      400,
    );

    await page.context().close();
    await inviteeCtx.dispose();
  });

  test('an expired invitation is marked expired and can be resent', async ({
    browser,
  }) => {
    const invitee = createAccount('members-expired');
    const inviteeCtx = await signIn(invitee);
    const invitation = await invite(ownerCtx, organization.id, invitee.email);
    await execSQL(
      FE_E2E_DB,
      `UPDATE invitations SET expires_at = now() - interval '1 hour' WHERE id = '${invitation.id.replace(/'/g, "''")}';`,
    );

    expect((await acceptInvitation(inviteeCtx, invitation.id)).status()).toBe(
      400,
    );

    const page = await openPage(browser, ownerCtx);
    await gotoMembers(page, organization);

    const row = rowByEmail(page, invitee.email);
    await expect(row).toBeHidden();
    await selectInvitationStatus(page, 'Expired');
    await expect(row).toContainText('Expired');

    await uiGetMoreOptionsButton(row).click();
    await page.getByRole('menuitem', { name: 'Resend' }).click();
    await uiVerifyToast(page, { hasText: 'Member invited successfully' });

    await selectInvitationStatus(page, 'Pending');
    await expect(row).toContainText('Pending');

    // Resending past expiry issues a new invitation rather than reviving the old one.
    const resent = (await listInvitations(ownerCtx, organization.id)).find(
      (i) => i.email === invitee.email && i.id !== invitation.id,
    );
    expect(resent?.status).toBe('pending');
    expect((await acceptInvitation(inviteeCtx, resent!.id)).status()).toBe(200);

    await page.context().close();
    await inviteeCtx.dispose();
  });
});
