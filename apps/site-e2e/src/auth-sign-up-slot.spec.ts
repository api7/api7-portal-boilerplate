import { expect, test } from '@playwright/test';
import { PATH_AUTH } from '@site/constants/path-prefix';
import { ConfigMapData } from '@site/lib/config/schema';

import { genAuth } from '../fixture';
import {
  getConfigMapYaml,
  patchConfigMapYaml,
  updateConfigMapYaml,
} from '../utils/devportal-config';
import { restartDevPortal } from '../utils/shell';

const SIGN_UP_CONSENT_LABEL = `I agree to Example's <a href="https://example.com/terms" target="_blank" rel="noopener noreferrer">Terms of use</a> and the <a href="https://example.com/privacy" target="_blank" rel="noopener noreferrer">Privacy policy</a>.`;

test.describe('Auth sign-up consent', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(600_000);
  test.use({ storageState: { cookies: [], origins: [] } });

  let defaultConfig: string | null = null;

  async function updateConsentLabelAndRestart(label?: string) {
    await patchConfigMapYaml<ConfigMapData>((configObj) => {
      configObj.app ??= {};

      if (label === undefined) {
        delete configObj.app.signUpConsentLabel;
      } else {
        configObj.app.signUpConsentLabel = label;
      }
    });
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

  test('requires accepting the configured consent before sign-up', async ({
    page,
  }) => {
    const auth = genAuth(`sign-up-consent-${Date.now()}`);
    await updateConsentLabelAndRestart(SIGN_UP_CONSENT_LABEL);
    await page.goto(`${PATH_AUTH}/sign-up`);
    await page.waitForLoadState('networkidle');

    // Base UI's checkbox is a span beside a hidden input, so the label is located by its `for` target.
    const consentLabel = page.locator('label[for="tosAccepted"]');
    const consentCheckbox = page.getByRole('checkbox');
    const signUpButton = page.getByRole('button', {
      name: 'Sign Up',
      exact: true,
    });

    await expect(consentLabel).toBeVisible();
    await expect(consentLabel).toContainText(/I agree to Example's/i);
    await expect(
      consentLabel.getByRole('link', { name: /terms of use/i }),
    ).toHaveAttribute('href', 'https://example.com/terms');
    await expect(
      consentLabel.getByRole('link', { name: /privacy policy/i }),
    ).toHaveAttribute('href', 'https://example.com/privacy');
    await expect(consentCheckbox).toHaveCount(1);
    await expect(consentCheckbox).not.toBeChecked();

    const isConsentBeforeSignUp = await consentLabel.evaluate((labelEl) => {
      const button = Array.from(
        labelEl.closest('form')?.querySelectorAll('button[type="submit"]') ??
          [],
      ).at(0);
      return Boolean(
        button &&
          labelEl.compareDocumentPosition(button) &
            Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
    expect(isConsentBeforeSignUp).toBeTruthy();

    await page.getByLabel('Name').fill(auth.name);
    await page.getByLabel('Email').fill(auth.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(auth.password);

    await signUpButton.click();
    await expect(
      page.getByText('You must accept the above terms to continue.'),
    ).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`${PATH_AUTH}/sign-up`);

    await consentCheckbox.click();
    await expect(consentCheckbox).toBeChecked();
    await expect(
      page.getByText('You must accept the above terms to continue.'),
    ).toBeHidden();

    await signUpButton.click();
    await page.waitForURL(
      (url) => url.pathname !== `${PATH_AUTH}/sign-up`,
      { timeout: 15_000 },
    );
  });

  test('does not render the consent checkbox when not configured', async ({
    page,
  }) => {
    await updateConsentLabelAndRestart(undefined);
    await page.goto(`${PATH_AUTH}/sign-up`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('button', { name: 'Sign Up', exact: true }),
    ).toBeVisible();
    await expect(page.locator('label[for="tosAccepted"]')).toHaveCount(0);
    await expect(page.getByRole('checkbox')).toHaveCount(0);
  });
});
