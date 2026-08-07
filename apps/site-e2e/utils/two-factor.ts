import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';
import { expect, type Locator, type Page } from '@playwright/test';
import { ConfigMapData } from '@site/lib/config/schema';

import { genAuth } from '../fixture';
import { createOrganization, genCtx, login } from '../req/common';
import { patchConfigMapYaml } from './devportal-config';
import { restartDevPortal } from './shell';

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

export const createTotpCode = async (totpURI: string) => {
  const { secret, digits, period } = getTotpChallengeConfigFromUri(totpURI);
  const decodedSecret = new TextDecoder().decode(base32.decode(secret));
  return await createOTP(decodedSecret, {
    digits,
    period,
  }).totp();
};

// Dialog content locator — base-ui dialog popup uses data-slot="dialog-content"
export const dialogContent = (page: Page) =>
  page.locator('[data-slot="dialog-content"]');

// Fills and submits the OTP for a pending TOTP verification inside `dialog`,
// then — unless resuming an interrupted setup, which skips straight past it
// (see `expectBackupCodes: false`) — acknowledges the Backup Codes step that
// follows a fresh enrollment.
export async function completeTotpVerification(
  dialog: Locator,
  totpURI: string,
  options: { expectBackupCodes?: boolean } = {},
): Promise<void> {
  const { expectBackupCodes = true } = options;
  const otpInput = dialog.locator('input[autocomplete="one-time-code"]');

  await expect(otpInput).toBeVisible({ timeout: 15_000 });
  const code = await createTotpCode(totpURI);
  await otpInput.fill(code);
  // OtpField's `onComplete` (enable-two-factor-dialog.tsx) submits as soon as
  // all digits are filled — the submit button is otherwise disabled until
  // then anyway. A separate click here is redundant and racy: verification
  // can already be in flight, sometimes advancing to the backup codes step
  // (which has no "Verify" button) before the click ever executes, hanging
  // until actionTimeout with no such button ever appearing.

  if (expectBackupCodes) {
    // The dialog title stays "Two-Factor Authentication" on this step too —
    // there's no "Backup Codes" heading to match. Use the step's actual copy.
    await expect(
      dialog.getByText(
        'Save these somewhere safe. Each code works once if you lose your authenticator.',
      ),
    ).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole('button', { name: /^done$/i }).click();
  }
}

// Sign-in is two-phase: email → Continue → password → Sign In
export const signIn = async (page: Page, email: string, password: string) => {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
};

// Patches `auth.twoFactor.enabled` (and, when given, `auth.twoFactor.required`)
// in the e2e config map and restarts the dev portal for it to take effect.
export async function updateTwoFactorConfigAndRestart({
  enabled,
  required,
}: {
  enabled: boolean;
  required?: boolean;
}): Promise<void> {
  await patchConfigMapYaml<ConfigMapData>((configObj) => {
    configObj.auth ??= {} as ConfigMapData['auth'];
    configObj.auth.twoFactor ??= { enabled: false, required: false };
    configObj.auth.twoFactor.enabled = enabled;
    if (required !== undefined) {
      configObj.auth.twoFactor.required = required;
    }
  });
  await restartDevPortal();
}

export async function createFreshAuth(label: string) {
  const auth = genAuth(
    `${label.replace(/[^a-z0-9]/gi, '').toLowerCase()}${Date.now()}`,
  );
  const ctx = await genCtx();
  await login(ctx, auth);
  await createOrganization(ctx, auth.organization!);
  await ctx.dispose();
  return auth;
}
