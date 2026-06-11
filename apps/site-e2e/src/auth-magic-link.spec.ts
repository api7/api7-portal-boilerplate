import { test as baseTest, expect } from '@playwright/test';
import { PATH_LOGIN } from '@site/constants/path-prefix';

import {
  clearAllEmails,
  extractMagicLinkFromEmail,
  getLastEmailTo,
} from '../req/email';
import { uiVerifyToast } from '../utils/ui';

// Use unauthenticated storage state for magic-link tests
const test = baseTest.extend({});
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Magic Link Authentication', () => {
  const testEmail = `magic-link-test-${Date.now()}@test.example.com`;

  test.beforeAll(async () => {
    // Clear all emails before tests
    await clearAllEmails();
  });

  test.skip('can sign in with magic link', async ({ page }) => {
    // TODO Phase 2: magic link button moved to /auth/magic-link — update flow
    await test.step('navigate to login page', async () => {
      await page.goto(PATH_LOGIN);
      await expect(page.getByText('Sign In', { exact: true }).first()).toBeVisible();
    });

    await test.step('click magic link button and request link', async () => {
      // Magic Link is a button, not a tab
      const magicLinkBtn = page.getByRole('button', {
        name: /sign in with magic link/i,
      });
      await expect(magicLinkBtn).toBeVisible();
      await magicLinkBtn.click();

      // Wait for magic link form to appear
      const magicLinkFormText = page.getByText(/enter your email.*magic link/i);
      await expect(magicLinkFormText).toBeVisible();

      // Find the magic link form container and fill the email within it
      const magicLinkForm = page.locator('form').filter({
        has: page.getByRole('button', { name: /send magic link/i }),
      });

      // Fill email and submit - be specific to the magic link form
      const emailInput = magicLinkForm.getByRole('textbox', { name: /email/i });
      await emailInput.fill(testEmail);

      // Verify email was filled correctly
      await expect(emailInput).toHaveValue(testEmail);

      // Click send and wait for toast
      await magicLinkForm
        .getByRole('button', { name: /send magic link/i })
        .click();

      // Verify success toast
      await uiVerifyToast(page, { hasText: /check your email/i });
    });

    await test.step('retrieve magic link from email', async () => {
      // Wait for email to arrive
      await page.waitForTimeout(2000);

      // Get the email and extract magic link
      const emailContent = await getLastEmailTo(testEmail);
      expect(emailContent).toContain('Click here to sign in');

      const magicLinkUrl = extractMagicLinkFromEmail(emailContent);
      expect(magicLinkUrl).toBeTruthy();

      // Navigate using path only (uses page's baseURL from playwright config)
      const url = new URL(magicLinkUrl);
      await page.goto(`${url.pathname}${url.search}`);
    });

    await test.step('verify successful authentication', async () => {
      // Successful sign-in may land on /auth/landing (no org yet) or leave /auth/*.
      await page.waitForURL(
        (url) =>
          url.pathname === '/auth/landing' ||
          !url.pathname.startsWith('/auth/'),
        {
          timeout: 10000,
        },
      );

      if (new URL(page.url()).pathname === '/auth/landing') {
        await expect(
          page.getByRole('heading', { name: 'Organizations' }),
        ).toBeVisible({ timeout: 10000 });
      } else {
        await expect(page.getByRole('button', { name: 'Account' })).toBeVisible(
          {
            timeout: 10000,
          },
        );
      }
    });
  });

  test('shows error for invalid magic link', async ({ page }) => {
    await page.goto(`${PATH_LOGIN}?error=INVALID_TOKEN`);
    await expect(page.getByText('Sign In', { exact: true }).first()).toBeVisible();
  });

  test.skip('magic link button is visible on login page', async ({ page }) => {
    // TODO Phase 2: magic link entry point moved to /auth/magic-link
    await page.goto(PATH_LOGIN);
    const magicLinkBtn = page.getByRole('button', {
      name: /sign in with magic link/i,
    });
    await expect(magicLinkBtn).toBeVisible();
  });
});
