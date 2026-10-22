import { type Browser, type Page, expect, test } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';
import { PATH_LOGIN } from '@site/constants/path-prefix';

import { E2E_TARGET_URL } from '../constant';
import { type Ctx, genCtx, getSession, login } from '../req/common';
import { execSQL } from '../utils/shell';
import { uiVerifyToast } from '../utils/ui';

const FE_E2E_DB = 'devportal_fe_e2e';

type Account = { email: string; password: string; name: string };

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

const signInStatus = async (email: string, password: string) => {
  const ctx = await genCtx();
  try {
    const res = await ctx.post(`${AUTH_BASE_PATH}/sign-in/email`, {
      data: { email, password },
      failOnStatusCode: false,
    });
    return res.status();
  } finally {
    await ctx.dispose();
  }
};

const hasSession = async (ctx: Ctx) => {
  const res = await getSession(ctx);
  expect(res.status()).toBe(200);
  const body = await res.json();
  return !!body?.session;
};

const openPage = async (browser: Browser, ctx: Ctx) => {
  const context = await browser.newContext({
    baseURL: E2E_TARGET_URL,
    storageState: await ctx.storageState(),
  });
  return context.newPage();
};

const gotoAccount = async (page: Page, path: 'settings' | 'security') => {
  await page.goto(`/account/${path}`);
  // Forms adopt their initial values once hydration settles.
  await page.waitForLoadState('networkidle');
};

const changePassword = async (
  page: Page,
  currentPassword: string,
  newPassword: string,
) => {
  await page
    .getByRole('textbox', { name: 'Current password' })
    .fill(currentPassword);
  await page.getByRole('textbox', { name: 'New password' }).fill(newPassword);
  await page.getByRole('button', { name: 'Update password' }).click();
};

test.describe('Account settings', () => {
  test('user can update their name', async ({ browser }) => {
    const account = createAccount('account-name');
    const ctx = await signIn(account);
    const page = await openPage(browser, ctx);
    await gotoAccount(page, 'settings');

    const newName = `${account.name}-renamed`;
    const nameInput = page.getByRole('textbox', { name: 'Name' });
    await expect(nameInput).toHaveValue(account.name);
    await nameInput.fill(newName);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await uiVerifyToast(page, { hasText: 'Profile updated successfully' });

    const session = await (await getSession(ctx)).json();
    expect(session.user.name).toBe(newName);

    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue(
      newName,
    );

    await page.context().close();
    await ctx.dispose();
  });
});

test.describe('Account security', () => {
  test('changing the password signs out other sessions', async ({
    browser,
  }) => {
    const account = createAccount('account-password');
    const ctx = await signIn(account);
    const otherCtx = await signIn(account);
    const page = await openPage(browser, ctx);
    await gotoAccount(page, 'security');

    const newPassword = `${account.password}-new`;
    await changePassword(page, account.password, newPassword);
    await uiVerifyToast(page, { hasText: 'Password changed successfully' });

    expect(await signInStatus(account.email, account.password)).toBe(401);
    expect(await signInStatus(account.email, newPassword)).toBe(200);
    expect(await hasSession(otherCtx)).toBe(false);

    await page.context().close();
    await otherCtx.dispose();
    await ctx.dispose();
  });

  test('a wrong current password does not change the password', async ({
    browser,
  }) => {
    const account = createAccount('account-wrong-password');
    const ctx = await signIn(account);
    const page = await openPage(browser, ctx);
    await gotoAccount(page, 'security');

    const changeRequest = page.waitForResponse((res) =>
      res.url().includes(`${AUTH_BASE_PATH}/change-password`),
    );
    await changePassword(page, `${account.password}-wrong`, 'Password3412.new');
    expect((await changeRequest).status()).toBe(400);
    await expect(
      page.locator('[data-sonner-toast][data-type="error"]'),
    ).toBeVisible();

    expect(await signInStatus(account.email, account.password)).toBe(200);
    expect(await signInStatus(account.email, 'Password3412.new')).toBe(401);

    await page.context().close();
    await ctx.dispose();
  });

  test('user can revoke another session', async ({ browser }) => {
    const account = createAccount('account-revoke');
    const ctx = await signIn(account);
    const otherCtx = await signIn(account);
    const page = await openPage(browser, ctx);
    await gotoAccount(page, 'security');

    const revoke = page.getByRole('button', { name: 'Revoke session' });
    await expect(revoke).toHaveCount(1);
    await revoke.click();
    await uiVerifyToast(page, { hasText: 'Session revoked successfully' });
    await expect(revoke).toHaveCount(0);

    expect(await hasSession(otherCtx)).toBe(false);
    expect(await hasSession(ctx)).toBe(true);

    await page.context().close();
    await otherCtx.dispose();
    await ctx.dispose();
  });

  test('sign out other devices keeps only the current session', async ({
    browser,
  }) => {
    const account = createAccount('account-sign-out-others');
    const ctx = await signIn(account);
    const otherCtxs = [await signIn(account), await signIn(account)];
    const page = await openPage(browser, ctx);
    await gotoAccount(page, 'security');

    await page.getByRole('button', { name: 'Sign out other devices' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Sign out other devices' })
      .click();
    await uiVerifyToast(page, {
      hasText: 'Other devices signed out successfully',
    });

    for (const otherCtx of otherCtxs) {
      expect(await hasSession(otherCtx)).toBe(false);
    }
    expect(await hasSession(ctx)).toBe(true);

    await page.context().close();
    for (const otherCtx of otherCtxs) await otherCtx.dispose();
    await ctx.dispose();
  });

  test('sign out everywhere ends every session', async ({ browser }) => {
    const account = createAccount('account-sign-out-all');
    const ctx = await signIn(account);
    const otherCtx = await signIn(account);
    const page = await openPage(browser, ctx);
    await gotoAccount(page, 'security');

    await page.getByRole('button', { name: 'Sign out everywhere' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Sign out everywhere' })
      .click();
    await expect(page).toHaveURL(new RegExp(`${PATH_LOGIN}`));

    expect(await hasSession(otherCtx)).toBe(false);
    expect(await hasSession(ctx)).toBe(false);

    await page.context().close();
    await otherCtx.dispose();
    await ctx.dispose();
  });

  test('an expired session is sent back to sign in', async ({ browser }) => {
    const account = createAccount('account-expired');
    const ctx = await signIn(account);
    const session = await (await getSession(ctx)).json();
    await execSQL(
      FE_E2E_DB,
      `UPDATE sessions SET expires_at = now() - interval '1 minute' WHERE id = '${String(session.session.id).replace(/'/g, "''")}';`,
    );

    const context = await browser.newContext({
      baseURL: E2E_TARGET_URL,
      storageState: await ctx.storageState(),
    });
    // Drop the short-lived signed session cache so the server reads the session row.
    const cookies = await context.cookies();
    await context.clearCookies();
    await context.addCookies(
      cookies.filter((cookie) => !cookie.name.endsWith('session_data')),
    );
    const page = await context.newPage();

    await page.goto('/account/security');
    await expect(page).toHaveURL(
      new RegExp(
        `${PATH_LOGIN}\\?redirectTo=${encodeURIComponent('/account/security')}`,
      ),
    );

    await context.close();
    await ctx.dispose();
  });
});
