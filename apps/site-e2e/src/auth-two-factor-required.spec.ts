import { expect } from '@playwright/test';
import { API_PREFIX } from '@site/constants/api-prefix';
import {
  PATH_ACCOUNT_SECURITY,
  PATH_ACCOUNT_TWO_FACTOR,
  PATH_LOGIN,
  PATH_ROOT,
} from '@site/constants/path-prefix';

import { test } from '../fixture';
import { genCtx, login } from '../req/common';
import { getConfigMapYaml, updateConfigMapYaml } from '../utils/devportal-config';
import { restartDevPortal } from '../utils/shell';
import {
  completeTotpVerification,
  createFreshAuth,
  dialogContent,
  signIn,
  updateTwoFactorConfigAndRestart,
} from '../utils/two-factor';

test.describe('Force two-factor authentication (auth.twoFactor.required)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(600_000);

  let defaultConfig: string | null = null;

  async function updateConfigAndRestart(required: boolean): Promise<void> {
    await updateTwoFactorConfigAndRestart({ enabled: required, required });
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

  // Every test flips `required` on for its own scenario after setting up a
  // fresh account (which needs `required` off, since org/application
  // creation is itself an org-scoped write the 403 guard would block).
  // Without resetting here, the next test's `createFreshAuth()` would run
  // while `required` is still on from this test and fail with 403 — and,
  // since this is a shared devportal instance, shrinking this window also
  // limits collateral impact on any other test that happens to run while
  // enforcement is on.
  test.afterEach(async () => {
    await updateConfigAndRestart(false);
  });

  test('signing in straight into forced enrollment reuses the just-typed password, no second prompt', async ({
    page,
  }) => {
    // Account + org are created while enforcement is still off, so the
    // account-creation API calls aren't themselves blocked by the 403 guard.
    const auth = await createFreshAuth('totp-required-login');
    await updateConfigAndRestart(true);

    await page.context().clearCookies();
    await page.goto(PATH_LOGIN);
    await expect(page.getByText('Sign In', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

    const enableResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/two-factor/enable') &&
        response.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await signIn(page, auth.email, auth.password);

    // Lands on the dedicated /account/two-factor page (no other settings
    // content, just the dialog) and auto-enrolls using the password just
    // typed into the sign-in form — no password field shown.
    // `useSignInContinuation` decides this client-side right after sign-in;
    // `proxy.ts`'s redirect (exercised by the next test) is only the
    // fallback for other entry points.
    await page.waitForURL(
      (url) => url.pathname.startsWith(PATH_ACCOUNT_TWO_FACTOR),
      { timeout: 15_000 },
    );
    const dialog = dialogContent(page);
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByLabel('Password', { exact: true })).toHaveCount(0);
    // Mandatory enrollment has no way to dismiss it.
    await expect(dialog.getByRole('button', { name: /^cancel$/i })).toHaveCount(0);

    const enableResponse = await enableResponsePromise;
    expect(enableResponse.status()).toBe(200);
    const { totpURI } = await enableResponse.json() as { totpURI: string };
    expect(totpURI).toBeTruthy();

    // Enable → verify → backup codes, same order as the optional flow.
    await completeTotpVerification(dialog, totpURI);

    // Acknowledging backup codes navigates on to the originally requested
    // page instead of just closing the dialog.
    await page.waitForURL(
      (url) => !url.pathname.startsWith(PATH_ACCOUNT_TWO_FACTOR),
      { timeout: 15_000 },
    );
  });

  test('an existing session with no stashed password falls back to an inline password prompt', async ({
    page,
  }) => {
    const auth = await createFreshAuth('totp-required-fallback');

    // Sign in via the UI while enforcement is still off, so the browser
    // session is established with nothing stashed (stashing only happens
    // when twoFactorRequired is already true at sign-in time).
    await page.context().clearCookies();
    await page.goto(PATH_LOGIN);
    await signIn(page, auth.email, auth.password);
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), { timeout: 15_000 });

    await updateConfigAndRestart(true);

    // proxy.ts is what catches this case — a plain navigation on an
    // existing, not-yet-enrolled session, with nothing stashed.
    await page.goto(PATH_ROOT);
    await page.waitForURL(
      (url) => url.pathname.startsWith(PATH_ACCOUNT_TWO_FACTOR),
      { timeout: 15_000 },
    );

    const dialog = dialogContent(page);
    const passwordField = dialog.getByLabel('Password', { exact: true });
    await expect(passwordField).toBeVisible({ timeout: 15_000 });

    const enableResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/two-factor/enable') &&
        response.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await passwordField.fill(auth.password);
    await dialog.getByRole('button', { name: /enable two-factor/i }).click();

    const enableResponse = await enableResponsePromise;
    expect(enableResponse.status()).toBe(200);
    const { totpURI } = await enableResponse.json() as { totpURI: string };

    await completeTotpVerification(dialog, totpURI);
    await page.waitForURL(
      (url) => !url.pathname.startsWith(PATH_ACCOUNT_TWO_FACTOR),
      { timeout: 15_000 },
    );
  });

  test('leaving mid-setup and resuming reuses the same TOTP secret instead of minting a new one', async ({
    page,
  }) => {
    const auth = await createFreshAuth('totp-required-resume');
    await updateConfigAndRestart(true);

    await page.context().clearCookies();
    await page.goto(PATH_LOGIN);

    const firstEnableResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/two-factor/enable') &&
        response.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await signIn(page, auth.email, auth.password);
    await page.waitForURL(
      (url) => url.pathname.startsWith(PATH_ACCOUNT_TWO_FACTOR),
      { timeout: 15_000 },
    );
    const firstEnableResponse = await firstEnableResponsePromise;
    const { totpURI: firstTotpURI } = await firstEnableResponse.json() as { totpURI: string };
    expect(firstTotpURI).toBeTruthy();

    // QR/verify is showing but not yet submitted — reload before finishing.
    let dialog = dialogContent(page);
    await expect(dialog.locator('input[autocomplete="one-time-code"]')).toBeVisible({ timeout: 15_000 });

    // The in-memory stashed password is gone after a reload, and this is a
    // password (credential) account, so the inline prompt reappears — that's
    // the expected fallback, not a regression.
    await page.reload();
    dialog = dialogContent(page);
    const passwordField = dialog.getByLabel('Password', { exact: true });
    await expect(passwordField).toBeVisible({ timeout: 15_000 });

    // Submitting the password now must call get-totp-uri (resume), not
    // enable() again — otherwise the secret generated above would be wiped
    // out and replaced, invalidating anything already scanned.
    const resumeResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/two-factor/get-totp-uri') &&
        response.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await passwordField.fill(auth.password);
    await dialog.getByRole('button', { name: /enable two-factor/i }).click();

    const resumeResponse = await resumeResponsePromise;
    expect(resumeResponse.status()).toBe(200);
    const { totpURI: resumedTotpURI } = await resumeResponse.json() as { totpURI: string };
    expect(resumedTotpURI).toBe(firstTotpURI);

    // Resuming skips backup codes entirely (already shown once, before the
    // reload) — verifying finishes enrollment and navigates on directly.
    await completeTotpVerification(dialog, resumedTotpURI, {
      expectBackupCodes: false,
    });
    await page.waitForURL(
      (url) => !url.pathname.startsWith(PATH_ACCOUNT_TWO_FACTOR),
      { timeout: 15_000 },
    );
  });

  test('direct API calls are rejected with 403 for a signed-in user who has not enrolled', async () => {
    const auth = await createFreshAuth('totp-required-api');
    await updateConfigAndRestart(true);

    const ctx = await genCtx();
    await login(ctx, auth);
    // Derive the slug the same way createOrganization() does, rather than
    // reading it back from the session's "active organization" — that's
    // only reliably populated right after the org is created in the same
    // session (see the @deprecated note on getActiveOrganizationId), and a
    // fresh login here doesn't carry that over.
    const orgSlug = auth.organization!.toLowerCase().replace(/\s+/g, '-');

    const res = await ctx.get(`${API_PREFIX}/${orgSlug}/applications`, {
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(403);

    await ctx.dispose();
  });

  test('security page offers Reset (not Disable) once enrolled, and reset mints a new secret without disabling', async ({
    page,
  }) => {
    const auth = await createFreshAuth('totp-required-reset');
    await updateConfigAndRestart(true);

    // Get the account into a fully-enrolled state via the sign-in auto-enroll path.
    await page.context().clearCookies();
    await page.goto(PATH_LOGIN);
    const firstEnableResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/two-factor/enable') &&
        response.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await signIn(page, auth.email, auth.password);
    await page.waitForURL(
      (url) => url.pathname.startsWith(PATH_ACCOUNT_TWO_FACTOR),
      { timeout: 15_000 },
    );
    const firstEnableResponse = await firstEnableResponsePromise;
    const { totpURI: firstTotpURI } = await firstEnableResponse.json() as { totpURI: string };

    const firstDialog = dialogContent(page);
    await completeTotpVerification(firstDialog, firstTotpURI);
    await page.waitForURL(
      (url) => !url.pathname.startsWith(PATH_ACCOUNT_TWO_FACTOR),
      { timeout: 15_000 },
    );

    // Now fully enrolled — the security page must offer "Reset", not "Disable".
    await page.goto(PATH_ACCOUNT_SECURITY);
    // The card title is "Two-Factor Authentication" (an h2) — exact:true
    // against just "Two-Factor" never matches.
    await expect(
      page.getByRole('heading', { name: 'Two-Factor Authentication' }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /disable two-factor/i })).toHaveCount(0);
    const resetButton = page.getByRole('button', { name: /reset two-factor/i });
    await expect(resetButton).toBeEnabled({ timeout: 15_000 });
    await resetButton.click();

    // "Reset" navigates to the same shared /account/two-factor page — not
    // an inline dialog on the security page — with ?redirect back here.
    await page.waitForURL(
      (url) => url.pathname.startsWith(PATH_ACCOUNT_TWO_FACTOR),
      { timeout: 15_000 },
    );
    const resetDialog = dialogContent(page);
    await expect(resetDialog).toBeVisible({ timeout: 5_000 });
    await expect(resetDialog.getByText(/set up a new authenticator/i)).toBeVisible();
    // This is the optional path (already enrolled, just resetting) — Cancel
    // must still be offered, unlike the mandatory first-enrollment case.
    await expect(resetDialog.getByRole('button', { name: /^cancel$/i })).toBeVisible();

    const resetEnableResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/two-factor/enable') &&
        response.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await resetDialog.getByLabel('Password', { exact: true }).fill(auth.password);
    await resetDialog.getByRole('button', { name: /reset two-factor/i }).click();

    const resetEnableResponse = await resetEnableResponsePromise;
    expect(resetEnableResponse.status()).toBe(200);
    const { totpURI: resetTotpURI } = await resetEnableResponse.json() as { totpURI: string };
    expect(resetTotpURI).toBeTruthy();
    // A genuinely new secret must have been minted, not the old one reused.
    expect(resetTotpURI).not.toBe(firstTotpURI);

    await completeTotpVerification(resetDialog, resetTotpURI);

    // Acknowledging backup codes navigates back to ?redirectTo=/account/security.
    await page.waitForURL(
      (url) => url.pathname.startsWith(PATH_ACCOUNT_SECURITY),
      { timeout: 15_000 },
    );

    // Still enrolled afterwards — 2FA was never disabled by the reset.
    await expect(page.getByRole('button', { name: /reset two-factor/i })).toBeVisible({ timeout: 30_000 });
  });
});
