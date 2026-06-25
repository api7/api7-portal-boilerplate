import { expect, test } from '@playwright/test';

/**
 * Regression test for the docs "Copy page" split-button dropdown.
 *
 * The dropdown is built on Base UI's `Menu.Item`, whose activation prop is
 * `onClick` — it has no `onSelect`. The four items were originally wired to
 * `onSelect`, which Base UI silently ignores, so every dropdown action was a
 * no-op (only the left split-button worked). These tests click each item and
 * assert its side effect actually fires.
 *
 * `/docs` is fully public (no login / backend), so we use the bare Playwright
 * `test` rather than the auth fixture. `window.open` is stubbed to record calls
 * instead of navigating to the real ChatGPT / Claude sites — keeping the test
 * hermetic while still proving the click handler ran.
 */
test.describe('docs "Copy page" menu', () => {
  type OpenRecorder = Window & { __opened?: string[] };

  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => {
      const w = window as Window & { __opened?: string[] };
      w.__opened = [];
      window.open = ((url?: string | URL) => {
        w.__opened!.push(String(url));
        return null;
      }) as typeof window.open;
    });
    await page.goto('/docs/getting-started');
  });

  const openMenu = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'More options' }).click();

  const recordedOpens = (page: import('@playwright/test').Page) =>
    page.evaluate(() => (window as OpenRecorder).__opened ?? []);

  test('Copy page copies the page Markdown to the clipboard', async ({
    page,
  }) => {
    await openMenu(page);
    await page.getByRole('menuitem', { name: /Copy page/ }).click();

    const clipboard = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    // The page source is non-trivial Markdown; assert we copied real content.
    expect(clipboard.length).toBeGreaterThan(0);
    expect(clipboard).toContain('#');
  });

  test('View as Markdown opens the raw Markdown in a new tab', async ({
    page,
  }) => {
    await openMenu(page);
    await page.getByRole('menuitem', { name: 'View as Markdown' }).click();

    const opened = await recordedOpens(page);
    expect(opened).toHaveLength(1);
    // viewMarkdown navigates to the page's .md endpoint.
    expect(opened[0]).toMatch(/\.md$/);
  });

  test('Open in ChatGPT hands the page off to ChatGPT', async ({ page }) => {
    await openMenu(page);
    await page.getByRole('menuitem', { name: 'Open in ChatGPT' }).click();

    const opened = await recordedOpens(page);
    expect(opened).toHaveLength(1);
    expect(opened[0]).toContain('https://chatgpt.com/?q=');
  });

  test('Open in Claude hands the page off to Claude', async ({ page }) => {
    await openMenu(page);
    await page.getByRole('menuitem', { name: 'Open in Claude' }).click();

    const opened = await recordedOpens(page);
    expect(opened).toHaveLength(1);
    expect(opened[0]).toContain('https://claude.ai/new?q=');
  });
});
