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

  test('sign-up navigates to the verify-email page', async ({ page }) => {
    await page.goto(`${PATH_AUTH}/sign-up`);
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Name').fill(auth.name);
    await page.getByLabel('Email').fill(auth.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(auth.password);
    await page.getByRole('button', { name: /sign up/i }).click();

    // sign-up.tsx navigates straight to /auth/verify-email when
    // requireEmailVerification is on — there's no toast/redirect-to-sign-in
    // step, the "check your email" copy is static page content on that view.
    // Actual URL carries a `?redirectTo=` query string, so match on pathname
    // rather than a glob (a glob with no trailing `**` never matches a URL
    // with a query string, and with no explicit timeout this silently hung
    // for the full 600s describe-level test.setTimeout instead of failing).
    await page.waitForURL(
      (url) => url.pathname === `${PATH_AUTH}/verify-email`,
      { timeout: 15_000 },
    );
    await expect(
      page.getByText(/check your email for a verification link/i),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('sign-in is blocked and redirects to the verify-email page when email is unverified', async ({ page }) => {
    await page.goto(`${PATH_AUTH}/sign-in`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('textbox', { name: 'Email' }).fill(auth.email);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(auth.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // EMAIL_NOT_VERIFIED never reaches the generic error toast — error-toaster.tsx
    // explicitly swallows that code — sign-in.tsx's onError instead redirects to
    // the same /auth/verify-email page sign-up uses, which has its own Resend
    // button in place of the old inline toast.
    await page.waitForURL(
      (url) => url.pathname === `${PATH_AUTH}/verify-email`,
      { timeout: 15_000 },
    );
    await expect(page.getByRole('button', { name: 'Resend' })).toBeVisible({
      timeout: 15_000,
    });
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
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(auth.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(
      (url) =>
        url.pathname === '/auth/landing' || !url.pathname.startsWith('/auth/'),
      { timeout: 15_000 },
    );
  });
});
