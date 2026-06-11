import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';
import { type Page, expect } from '@playwright/test';
import { PATH_ACCOUNT, PATH_LOGIN } from '@site/constants/path-prefix';
import { ConfigMapData } from '@site/lib/config/schema';

import { test } from '../fixture';
import {
  getConfigMapYaml,
  patchConfigMapYaml,
  updateConfigMapYaml,
} from '../utils/devportal-config';
import { restartDevPortal } from '../utils/shell';

const getTotpChallengeConfigFromUri = (totpURI: string) => {
  const totpSetup = new URL(totpURI);
  const secret = totpSetup.searchParams.get('secret');
  if (!secret) {
    throw new Error('Missing `secret` in `totpURI`');
  }

  return {
    secret,
    digits: Number(totpSetup.searchParams.get('digits') || '6'),
    period: Number(totpSetup.searchParams.get('period') || '30'),
  };
};

const createTotpCode = async (totpURI: string) => {
  const { secret, digits, period } = getTotpChallengeConfigFromUri(totpURI);
  const decodedSecret = new TextDecoder().decode(base32.decode(secret));
  return await createOTP(decodedSecret, {
    digits,
    period,
  }).totp();
};

// Dialog content locator — base-ui dialog popup uses data-slot="dialog-content"
const dialogContent = (page: Page) =>
  page.locator('[data-slot="dialog-content"]');

// Keep the test idempotent: if a previous run already enabled 2FA, disable it first.
async function ensureTwoFactorDisabled(
  page: Page,
  password: string,
): Promise<void> {
  const disableButton = page.getByRole('button', {
    name: /disable two-factor/i,
  });
  if (!(await disableButton.isVisible())) {
    return;
  }

  await disableButton.click();
  const passwordDialog = dialogContent(page);
  await expect(passwordDialog).toBeVisible();
  await passwordDialog.getByLabel('Password', { exact: true }).fill(password);
  await passwordDialog
    .getByRole('button', { name: /disable two-factor/i })
    .click();

  // Wait for dialog to close (API call succeeded), then check button updated
  await expect(dialogContent(page)).not.toBeVisible({ timeout: 10_000 });

  await expect(
    page.getByRole('button', { name: /enable two-factor/i }),
  ).toBeVisible({ timeout: 30_000 });
}

// Sign-in is two-phase: email → Continue → password → Sign In
async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
}

test.describe('Two-Factor Authentication (TOTP only)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(600_000);

  let defaultConfig: string | null = null;

  async function patchTwoFactorEnabled(enabled: boolean): Promise<void> {
    await patchConfigMapYaml<ConfigMapData>((configObj) => {
      configObj.auth ??= {} as ConfigMapData['auth'];
      configObj.auth.twoFactor ??= { enabled: false };
      configObj.auth.twoFactor.enabled = enabled;
    });
  }

  async function updateConfigAndRestart(enabled: boolean): Promise<void> {
    await patchTwoFactorEnabled(enabled);
    await restartDevPortal();
  }

  test.beforeAll(async () => {
    defaultConfig = await getConfigMapYaml();
  });

  test.afterAll(async () => {
    if (!defaultConfig) {
      return;
    }

    await updateConfigMapYaml(defaultConfig);
    await restartDevPortal();
  });

  test('enables TOTP-only flow when enabled', async ({
    page,
    auth,
  }) => {
    await updateConfigAndRestart(true);

    // Navigate to security settings; ensure 2FA is disabled before testing enable
    await page.goto(`${PATH_ACCOUNT}/security`);
    await expect(page.getByText('Two-Factor', { exact: true })).toBeVisible({ timeout: 30_000 });
    await ensureTwoFactorDisabled(page, auth.password);

    // Open "Enable Two-Factor" dialog and fill password
    await page.getByRole('button', { name: /enable two-factor/i }).click();
    const passwordDialog = dialogContent(page);
    await expect(passwordDialog).toBeVisible();
    await passwordDialog.getByLabel('Password', { exact: true }).fill(auth.password);

    // Intercept the enable API response to capture totpURI for later TOTP generation
    const enableResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/two-factor/enable') &&
        response.request().method() === 'POST',
    );
    await passwordDialog
      .getByRole('button', { name: /enable two-factor/i })
      .click();

    const enableResponse = await enableResponsePromise;
    expect(enableResponse.status()).toBe(200);
    const enableBody = await enableResponse.json();
    expect(enableBody?.totpURI).toBeTruthy();
    expect(Array.isArray(enableBody?.backupCodes)).toBe(true);
    const totpURI = enableBody.totpURI as string;

    // Backup codes dialog appears after the password dialog closes; click "Continue"
    const backupCodesDialog = dialogContent(page).filter({ hasText: 'Backup Codes' });
    await expect(backupCodesDialog).toBeVisible({ timeout: 5_000 });
    await backupCodesDialog.getByRole('button', { name: /continue/i }).click();

    // Should navigate to /auth/two-factor?totpURI=... (setup confirmation page with QR code)
    await page.waitForURL(
      (url) => url.pathname.startsWith('/auth/two-factor') && url.searchParams.has('totpURI'),
      { timeout: 15_000 },
    );

    // Fill OTP input and click Verify to confirm setup
    const setupCode = await createTotpCode(totpURI);
    const otpInput = page.locator('input[autocomplete="one-time-code"]');
    await expect(otpInput).toBeVisible({ timeout: 5_000 });
    await otpInput.fill(setupCode);
    await page.getByRole('button', { name: /^verify$/i }).click();

    // Should redirect away from the two-factor setup page after successful verification
    await page.waitForURL(
      (url) => !url.pathname.startsWith('/auth/two-factor'),
      { timeout: 15_000 },
    );

    // Clear session to simulate the next login; verify 2FA challenge is required
    await page.context().clearCookies();
    await page.goto(PATH_LOGIN);
    await expect(page.getByText('Sign In', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    // Sign-in is two-phase: fill email → Continue → fill password → Sign In
    await signIn(page, auth.email, auth.password);

    // After password-only sign-in, should redirect to 2FA challenge page (no totpURI param)
    await page.waitForURL(
      (url) => url.pathname.startsWith('/auth/two-factor'),
      { timeout: 15_000 },
    );
    expect(new URL(page.url()).searchParams.has('totpURI')).toBe(false);

    // Complete the 2FA login with a fresh TOTP code
    const loginCode = await createTotpCode(totpURI);
    const loginOtpInput = page.locator('input[autocomplete="one-time-code"]');
    await expect(loginOtpInput).toBeVisible({ timeout: 5_000 });
    await loginOtpInput.fill(loginCode);
    await page.getByRole('button', { name: /^verify$/i }).click();

    // Should redirect away from 2FA page (fully logged in)
    await page.waitForURL(
      (url) => !url.pathname.startsWith('/auth/two-factor'),
      { timeout: 15_000 },
    );

    // Cleanup: disable 2FA so this worker's account doesn't affect other tests
    await page.goto(`${PATH_ACCOUNT}/security`);
    await expect(page.getByRole('button', { name: /disable two-factor/i })).toBeVisible({ timeout: 30_000 });
    await ensureTwoFactorDisabled(page, auth.password);
  });

  test('hides two-factor card when disabled', async ({ page }) => {
    await updateConfigAndRestart(false);

    await page.goto(`${PATH_ACCOUNT}/security`);
    await expect(page.getByText('Two-Factor', { exact: true })).toHaveCount(0);
  });
});
