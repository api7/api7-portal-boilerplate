import { expect, test } from '@playwright/test';
import { PATH_AUTH } from '@site/constants/path-prefix';
import type { ConfigMapData } from '@site/lib/config/schema';

import { genAuth } from '../fixture';
import {
  getConfigMapYaml,
  patchConfigMapYaml,
  updateConfigMapYaml,
} from '../utils/devportal-config';
import { restartDevPortal } from '../utils/shell';
import { uiVerifyToast } from '../utils/ui';

test.describe('Email verification enforcement', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(600_000);
  test.use({ storageState: { cookies: [], origins: [] } });

  let defaultConfig: string | null = null;
  const auth = genAuth(`email-verify-${Date.now()}`);

  test.beforeAll(async () => {
    defaultConfig = await getConfigMapYaml();
    await patchConfigMapYaml<ConfigMapData>((config) => {
      config.auth.emailAndPassword.requireEmailVerification = true;
    });
    await restartDevPortal();
  });

  test.afterAll(async () => {
    if (defaultConfig) {
      await updateConfigMapYaml(defaultConfig);
      await restartDevPortal();
    }
  });

  test('sign-up shows verification toast and redirects to sign-in', async ({ page }) => {
    await page.goto(`${PATH_AUTH}/sign-up`);
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Name').fill(auth.name);
    await page.getByLabel('Email').fill(auth.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(auth.password);
    await page.getByRole('button', { name: /sign up/i }).click();

    await uiVerifyToast(page, { hasText: /verify your email/i });
    await page.waitForURL(`**${PATH_AUTH}/sign-in`);
  });

  test('sign-in is blocked with resend button when email is unverified', async ({ page }) => {
    await page.goto(`${PATH_AUTH}/sign-in`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('textbox', { name: 'Email' }).fill(auth.email);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(auth.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    const errorToast = page.locator('li').filter({ hasText: /email not verified/i });
    await expect(errorToast).toBeVisible({ timeout: 10_000 });
    await expect(errorToast.getByRole('button', { name: /resend/i })).toBeVisible();
  });

  test('sign-in succeeds normally when email verification is disabled', async ({ page }) => {
    // Restore config so this test acts as a regression guard:
    // flipping requireEmailVerification back to false must allow immediate sign-in.
    await updateConfigMapYaml(defaultConfig!);
    await restartDevPortal();
    // Clear defaultConfig so afterAll skips the redundant second restart.
    defaultConfig = null;

    await page.goto(`${PATH_AUTH}/sign-in`);
    await page.waitForLoadState('networkidle');

    // The account created above still has emailVerified=false in the DB,
    // but with requireEmailVerification=false the server no longer enforces it.
    await page.getByRole('textbox', { name: 'Email' }).fill(auth.email);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(auth.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(
      (url) =>
        url.pathname === '/auth/landing' || !url.pathname.startsWith('/auth/'),
      { timeout: 15_000 },
    );
  });
});
