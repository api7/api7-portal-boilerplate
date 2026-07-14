import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';
import { type Page } from '@playwright/test';

import { genAuth } from '../fixture';
import { createOrganization, genCtx, login } from '../req/common';

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

// Sign-in is two-phase: email → Continue → password → Sign In
export const signIn = async (page: Page, email: string, password: string) => {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
};

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
