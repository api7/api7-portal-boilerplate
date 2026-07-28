import { type Page, expect } from '@playwright/test';
import { PATH_ACCOUNT, PATH_LOGIN } from '@site/constants/path-prefix';

import { test } from '../fixture';
import { getConfigMapYaml, updateConfigMapYaml } from '../utils/devportal-config';
import { restartDevPortal } from '../utils/shell';
import {
  createFreshAuth,
  createTotpCode,
  dialogContent,
  signIn,
  updateTwoFactorConfigAndRestart,
} from '../utils/two-factor';

async function openTwoFactorPasswordDialog(page: Page) {
  await expect(async () => {
    const enableButton = page.getByRole('button', {
      name: /enable two-factor/i,
    }).first();
    await expect(enableButton).toBeEnabled({ timeout: 2_000 });
    await enableButton.click();
    await expect(dialogContent(page)).toBeVisible({ timeout: 2_000 });
    await expect(
      dialogContent(page).getByLabel('Password', { exact: true }),
    ).toBeEditable({ timeout: 2_000 });
  }).toPass({ timeout: 30_000, intervals: [500] });
}

async function submitEnableTwoFactorPassword(
  page: Page,
  password: string,
) {
  await expect(async () => {
    const passwordDialog = dialogContent(page);
    await expect(passwordDialog).toBeVisible({ timeout: 2_000 });
    await passwordDialog.getByLabel('Password', { exact: true }).fill(password);
    await passwordDialog
      .getByRole('button', { name: /enable two-factor/i })
      .click();
  }).toPass({ timeout: 30_000, intervals: [500] });
}

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

// Navigate to the security page. Re-authenticates if the workerStorageState session was
// revoked by a prior serial test's twoFactor.disable() call (Better Auth revokes all
// sessions when 2FA settings change). Waits for the enable/disable button to be ready.
async function ensureSignedInToSecurityPage(
  page: Page,
  auth: { email: string; password: string },
): Promise<void> {
  await page.context().clearCookies();
  await page.goto(`${PATH_ACCOUNT}/security`);
  await page.waitForLoadState('networkidle');

  if (
    page.url().includes('/auth/') ||
    (await page.getByRole('button', { name: 'Continue' }).isVisible())
  ) {
    await signIn(page, auth.email, auth.password);
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), {
      timeout: 30_000,
    });
    if (!page.url().includes('/security')) {
      await page.goto(`${PATH_ACCOUNT}/security`);
      await page.waitForLoadState('networkidle');
    }
  }

  await expect(
    page.getByRole('button', { name: /enable two-factor|disable two-factor/i }),
  ).toBeEnabled({ timeout: 30_000 });
}

test.describe('Two-Factor Authentication (TOTP only)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(600_000);

  let defaultConfig: string | null = null;

  async function updateConfigAndRestart(enabled: boolean): Promise<void> {
    await updateTwoFactorConfigAndRestart({ enabled });
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

  test('enables TOTP-only flow when enabled', async ({ page }) => {
    const auth = await createFreshAuth('totp-enable');
    await updateConfigAndRestart(true);

    // Navigate to security settings; ensure 2FA is disabled before testing enable
    await ensureSignedInToSecurityPage(page, auth);
    await expect(page.getByText('Two-Factor', { exact: true })).toBeVisible({ timeout: 30_000 });
    await ensureTwoFactorDisabled(page, auth.password);

    // Open "Enable Two-Factor" dialog and fill password
    await openTwoFactorPasswordDialog(page);

    // Intercept the enable API response to capture totpURI for later TOTP generation
    const enableResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/two-factor/enable') &&
        response.request().method() === 'POST',
    );
    await submitEnableTwoFactorPassword(page, auth.password);

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

  test('rejects wrong password when enabling: dialog stays open with field error, no backup codes', async ({
    page,
  }) => {
    const auth = await createFreshAuth('totp-wrong-password');
    test.setTimeout(60_000);
    // 2FA config is already enabled from the previous test's restart.
    await ensureSignedInToSecurityPage(page, auth);
    await ensureTwoFactorDisabled(page, auth.password);

    await openTwoFactorPasswordDialog(page);
    const passwordDialog = dialogContent(page);

    const enableResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/two-factor/enable') &&
        response.request().method() === 'POST',
    );
    await submitEnableTwoFactorPassword(page, 'definitely-wrong-password!');

    const enableResponse = await enableResponsePromise;
    // Bad password must be rejected by the server
    expect(enableResponse.status()).not.toBe(200);

    // Dialog must remain open
    await expect(passwordDialog).toBeVisible({ timeout: 5_000 });

    // Field error (role="alert" from FieldError) must be shown inside the dialog
    await expect(passwordDialog.locator('[data-slot="field-error"]')).toBeVisible({ timeout: 5_000 });

    // Backup codes dialog must NOT appear — the bug was that it opened with empty codes
    await expect(dialogContent(page).filter({ hasText: 'Backup Codes' })).not.toBeVisible();
  });

  test('backup codes dialog shows actual codes and copy button works', async ({
    page,
    context,
  }) => {
    const auth = await createFreshAuth('totp-backup-codes');
    test.setTimeout(120_000);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await ensureSignedInToSecurityPage(page, auth);
    await ensureTwoFactorDisabled(page, auth.password);

    await openTwoFactorPasswordDialog(page);

    const enableResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/two-factor/enable') &&
        response.request().method() === 'POST',
    );
    await submitEnableTwoFactorPassword(page, auth.password);

    const enableResponse = await enableResponsePromise;
    expect(enableResponse.status()).toBe(200);
    const enableBody = await enableResponse.json();
    const backupCodesFromApi: string[] = enableBody.backupCodes;
    expect(backupCodesFromApi.length).toBeGreaterThan(0);

    // Backup codes dialog should appear with the actual codes rendered
    const backupCodesDialog = dialogContent(page).filter({ hasText: 'Backup Codes' });
    await expect(backupCodesDialog).toBeVisible({ timeout: 5_000 });

    // Each code from the API response must be visible in the dialog
    for (const code of backupCodesFromApi) {
      await expect(backupCodesDialog.getByText(code, { exact: true })).toBeVisible();
    }

    // Copy All button must copy all codes joined by newlines
    await backupCodesDialog.getByRole('button', { name: /copy all/i }).click();
    await expect(backupCodesDialog.getByRole('button', { name: /copied/i })).toBeVisible({ timeout: 3_000 });

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(backupCodesFromApi.join('\n'));

    // Cleanup: dismiss dialog, then disable 2FA (need to complete setup first)
    const totpURI = enableBody.totpURI as string;
    await backupCodesDialog.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(
      (url) => url.pathname.startsWith('/auth/two-factor') && url.searchParams.has('totpURI'),
      { timeout: 15_000 },
    );
    const setupCode = await createTotpCode(totpURI);
    await page.locator('input[autocomplete="one-time-code"]').fill(setupCode);
    await page.getByRole('button', { name: /^verify$/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/two-factor'), { timeout: 15_000 });

    await page.goto(`${PATH_ACCOUNT}/security`);
    await ensureTwoFactorDisabled(page, auth.password);
  });

  test('wrong TOTP code at login stays on 2FA page with error toast instead of navigating away', async ({ page }) => {
    const auth = await createFreshAuth('totp-wrong-code');
    test.setTimeout(120_000);
    await ensureSignedInToSecurityPage(page, auth);
    await ensureTwoFactorDisabled(page, auth.password);

    // Enable 2FA and complete setup to get a valid TOTP secret
    await openTwoFactorPasswordDialog(page);

    const enableResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/two-factor/enable') &&
        response.request().method() === 'POST',
    );
    await submitEnableTwoFactorPassword(page, auth.password);

    const enableResponse = await enableResponsePromise;
    expect(enableResponse.status()).toBe(200);
    const { totpURI } = await enableResponse.json() as { totpURI: string };

    const backupCodesDialog = dialogContent(page).filter({ hasText: 'Backup Codes' });
    await expect(backupCodesDialog).toBeVisible({ timeout: 5_000 });
    await backupCodesDialog.getByRole('button', { name: /continue/i }).click();

    await page.waitForURL(
      (url) => url.pathname.startsWith('/auth/two-factor') && url.searchParams.has('totpURI'),
      { timeout: 15_000 },
    );
    const setupCode = await createTotpCode(totpURI);
    await page.locator('input[autocomplete="one-time-code"]').fill(setupCode);
    await page.getByRole('button', { name: /^verify$/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/two-factor'), { timeout: 15_000 });

    // Clear session to simulate a fresh login
    await page.context().clearCookies();
    await page.goto(PATH_LOGIN);
    await expect(page.getByText('Sign In', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    await signIn(page, auth.email, auth.password);

    // Should arrive at the 2FA challenge page (no totpURI param — this is the login challenge)
    await page.waitForURL(
      (url) => url.pathname.startsWith('/auth/two-factor') && !url.searchParams.has('totpURI'),
      { timeout: 15_000 },
    );

    // Enter a wrong 6-digit code
    const otpInput = page.locator('input[autocomplete="one-time-code"]');
    await expect(otpInput).toBeVisible({ timeout: 5_000 });
    await otpInput.fill('000000');
    await page.getByRole('button', { name: /^verify$/i }).click();

    // Bug: before the fix this would navigate to the home page.
    // After the fix the page must stay on the 2FA path and show a toast error.
    await expect(page).toHaveURL(/\/auth\/two-factor/, { timeout: 10_000 });
    await expect(page.locator('li').filter({ hasText: /invalid|incorrect|wrong/i })).toBeVisible({ timeout: 5_000 });

    // Now enter the correct code and succeed
    const loginCode = await createTotpCode(totpURI);
    await otpInput.fill(loginCode);
    await page.getByRole('button', { name: /^verify$/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/two-factor'), { timeout: 15_000 });

    // Cleanup
    await page.goto(`${PATH_ACCOUNT}/security`);
    await ensureTwoFactorDisabled(page, auth.password);
  });

  test('hides two-factor card when disabled', async ({ page }) => {
    await updateConfigAndRestart(false);

    await page.goto(`${PATH_ACCOUNT}/security`);
    await expect(page.getByText('Two-Factor', { exact: true })).toHaveCount(0);
  });
});
