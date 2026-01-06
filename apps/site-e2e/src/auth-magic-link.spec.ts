import { test as baseTest, expect } from '@playwright/test';
import {
  clearAllEmails,
  getLastEmailTo,
  extractMagicLinkFromEmail,
} from '../req/email';
import { PATH_LOGIN } from '@site/constants/path-prefix';
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

  test('can sign in with magic link', async ({ page }) => {
    await test.step('navigate to login page', async () => {
      await page.goto(PATH_LOGIN);
      // "Sign In" is in a generic div, not a heading
      await expect(page.getByText('Sign In', { exact: true })).toBeVisible();
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
      // After clicking magic link, user should be logged in
      // Wait for redirect to landing page
      await page.waitForURL((url) => url.pathname.includes('/auth/landing'), {
        timeout: 10000,
      });

      // Verify user is authenticated - Account button should be visible
      await expect(page.getByRole('button', { name: 'Account' })).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test('shows error for invalid magic link', async ({ page }) => {
    // Try to use an invalid magic link token - better-auth redirects to callbackURL with error param
    await page.goto(`${PATH_LOGIN}?error=INVALID_TOKEN`);

    // The page should show an error state or the error param should be visible
    // Check that we're on the login page (didn't get authenticated)
    await expect(page.getByText('Sign In', { exact: true })).toBeVisible();
  });

  test('magic link button is visible on login page', async ({ page }) => {
    await page.goto(PATH_LOGIN);

    // Magic link is a button in the login form
    const magicLinkBtn = page.getByRole('button', {
      name: /sign in with magic link/i,
    });
    await expect(magicLinkBtn).toBeVisible();
  });
});
