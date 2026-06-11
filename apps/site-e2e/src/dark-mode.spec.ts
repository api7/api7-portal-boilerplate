import { expect } from '@playwright/test';

import { test } from '../fixture';

const TOGGLE_LABEL = 'Toggle theme';

/** Force a specific theme via localStorage and reload so next-themes picks it up. */
const setTheme = async (
  page: import('@playwright/test').Page,
  theme: 'light' | 'dark',
) => {
  await page.evaluate((t) => localStorage.setItem('theme', t), theme);
  // networkidle ensures React has re-hydrated with the new theme before the
  // caller makes assertions or interactions.
  await page.reload({ waitUntil: 'networkidle' });
};

test.describe('Dark Mode', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    // Navigate to a stable public page and reset to light mode so every test
    // starts from a known state. networkidle guarantees React has fully
    // hydrated (and thus event handlers are attached) before each test.
    await page.goto('/api-hub', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.setItem('theme', 'light'));
    await page.reload({ waitUntil: 'networkidle' });
  });

  test('theme toggle button is visible in the header', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: TOGGLE_LABEL }),
    ).toBeVisible();
  });

  test('clicking toggle switches html element to dark mode', async ({
    page,
  }) => {
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/\bdark\b/);

    await page.getByRole('button', { name: TOGGLE_LABEL }).click();

    await expect(html).toHaveClass(/\bdark\b/);
  });

  test('clicking toggle twice returns to light mode', async ({ page }) => {
    const html = page.locator('html');
    const toggleBtn = page.getByRole('button', { name: TOGGLE_LABEL });

    await toggleBtn.click();
    await expect(html).toHaveClass(/\bdark\b/);

    await toggleBtn.click();
    await expect(html).not.toHaveClass(/\bdark\b/);
  });

  test('dark mode is saved to localStorage', async ({ page }) => {
    await page.getByRole('button', { name: TOGGLE_LABEL }).click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    const stored = await page.evaluate(() => localStorage.getItem('theme'));
    expect(stored).toBe('dark');
  });

  test('dark mode persists after full page reload', async ({ page }) => {
    await page.getByRole('button', { name: TOGGLE_LABEL }).click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });

  test('light mode persists after full page reload', async ({ page }) => {
    // Start from dark, switch to light, then reload.
    await setTheme(page, 'dark');
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    await page.getByRole('button', { name: TOGGLE_LABEL }).click();
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
  });

  test('dark mode persists across client-side navigation', async ({ page }) => {
    await setTheme(page, 'dark');
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    // Use the header nav link for a real Next.js soft navigation.
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'API Hub' })
      .click();
    await page.waitForURL(/api-hub/);

    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });

  test('light mode persists across client-side navigation', async ({ page }) => {
    // Already in light mode (set by beforeEach).
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);

    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'API Hub' })
      .click();
    await page.waitForURL(/api-hub/);

    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
  });

  test('dark mode class applied before page paint (no FOUC)', async ({
    page,
  }) => {
    // Set dark in localStorage so the next-themes inline script can read it.
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));

    // Navigate and wait only for DOMContentLoaded: the HTML is parsed and the
    // synchronous next-themes <script> has already run, so the dark class must
    // be present before any React code executes.
    await page.goto('/api-hub', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });
});
