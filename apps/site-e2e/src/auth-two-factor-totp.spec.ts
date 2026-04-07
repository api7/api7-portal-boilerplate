import { expect, type Page } from '@playwright/test';
import { test } from '../fixture';
import { PATH_ACCOUNT } from '@site/constants/path-prefix';
import { API_CONFIG_STATUS } from '@site/constants/api-prefix';
import { ConfigMapData } from '@site/lib/config/schema';
import { createOTP } from '@better-auth/utils/otp';
import { base32 } from '@better-auth/utils/base32';
import {
  getConfigMapYaml,
  patchConfigMapYaml,
  updateConfigMapYaml,
} from '../utils/devportal-config';
import { restartDevPortal } from '../utils/shell';

// Better Auth encodes TOTP setup data in the `totpURI` query param on the challenge URL.
const getTotpChallengeConfigFromUrl = (pageUrl: string) => {
  const currentUrl = new URL(pageUrl);
  const totpURI = currentUrl.searchParams.get('totpURI');
  if (!totpURI) {
    throw new Error('Missing `totpURI` in two-factor challenge URL');
  }

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

// Generate a real TOTP code and complete the verification step to assert end-to-end login.
async function completeTotpVerification(page: Page): Promise<void> {
  const { secret, digits, period } = getTotpChallengeConfigFromUrl(page.url());
  const decodedSecret = new TextDecoder().decode(base32.decode(secret));
  const code = await createOTP(decodedSecret, {
    digits,
    period,
  }).totp();

  await page.locator('input[data-input-otp]').fill(code);
  await page.waitForURL((url) => !url.pathname.includes('/auth/two-factor'), {
    timeout: 10_000,
  });
  await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
}

// Keep the test idempotent: if previous runs already enabled 2FA, disable it first.
async function ensureTwoFactorDisabled(
  page: Page,
  password: string
): Promise<void> {
  const disableButton = page.getByRole('button', { name: /disable two-factor/i });
  if (!(await disableButton.isVisible())) {
    return;
  }

  await disableButton.click();
  const passwordDialog = page.getByRole('dialog');
  await expect(passwordDialog).toBeVisible();
  await passwordDialog.getByLabel(/password/i).fill(password);
  await passwordDialog
    .getByRole('button', { name: /disable two-factor/i })
    .click();

  await expect(
    page.getByRole('button', { name: /enable two-factor/i })
  ).toBeVisible();
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

  test('enables TOTP-only flow when enabled', async ({ page, request, auth }) => {
    await updateConfigAndRestart(true);

    const configStatusRes = await request.get(API_CONFIG_STATUS);
    expect(configStatusRes.ok()).toBeTruthy();
    const configStatus = await configStatusRes.json();
    expect(configStatus.twoFactor).toBe(true);

    await page.goto(`${PATH_ACCOUNT}/security`);
    await expect(page.getByText('Two-Factor', { exact: true })).toBeVisible();
    await ensureTwoFactorDisabled(page, auth.password);

    await page.getByRole('button', { name: /enable two-factor/i }).click();

    const passwordDialog = page.getByRole('dialog');
    await expect(passwordDialog).toBeVisible();
    await passwordDialog.getByLabel(/password/i).fill(auth.password);
    await passwordDialog
      .getByRole('button', { name: /enable two-factor/i })
      .click();

    const backupCodesDialog = page.getByRole('dialog');
    await expect(
      backupCodesDialog.getByRole('heading', { name: 'Backup Codes' })
    ).toBeVisible();
    await backupCodesDialog.getByRole('button', { name: 'Continue' }).click();

    await page.waitForURL(
      (url) =>
        url.pathname.includes('/auth/two-factor') &&
        url.searchParams.has('totpURI'),
      { timeout: 10_000 }
    );

    await expect(
      page.getByText(/scan the qr code with your authenticator/i)
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /send verification code/i })
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /continue with authenticator/i })
    ).toHaveCount(0);
    await completeTotpVerification(page);

    // Cleanup user-level 2FA state so this suite does not leak auth state.
    await page.goto(`${PATH_ACCOUNT}/security`);
    await ensureTwoFactorDisabled(page, auth.password);
  });

  test('hides two-factor card when disabled', async ({ page, request }) => {
    await updateConfigAndRestart(false);

    const configStatusRes = await request.get(API_CONFIG_STATUS);
    expect(configStatusRes.ok()).toBeTruthy();
    const configStatus = await configStatusRes.json();
    expect(configStatus.twoFactor).toBe(false);

    await page.goto(`${PATH_ACCOUNT}/security`);
    await expect(page.getByText('Two-Factor', { exact: true })).toHaveCount(0);
  });
});
