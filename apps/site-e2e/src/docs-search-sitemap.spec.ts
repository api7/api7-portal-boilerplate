import { readdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';
import { PATH_API_HUB } from '@site/constants/path-prefix';

import { waitForHydration } from '../utils/helper';

test.use({ storageState: { cookies: [], origins: [] } });

// The docs search index is built in the browser, so the docs pages are read from the content folder.
const DOCS_DIR = path.resolve(__dirname, '../../site/content/docs');

const getDocPagePaths = () =>
  readdirSync(DOCS_DIR)
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => file.replace(/\.mdx?$/, ''))
    .map((name) => (name === 'index' ? '/docs' : `/docs/${name}`));

test.describe('Docs search', () => {
  test('searching for a page title opens that page', async ({ page }) => {
    await page.goto('/docs');
    await waitForHydration(page);

    await page.getByRole('button', { name: /^Search/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Search' });
    await dialog
      .getByPlaceholder('Search documentation…')
      .fill('Running the project');
    await dialog
      .getByRole('button', { name: 'Running the project' })
      .first()
      .click();

    await expect(page).toHaveURL(/\/docs\/getting-started$/);
  });

  test('searching from the docs opens the matching section', async ({
    page,
  }) => {
    await page.goto('/docs');
    await waitForHydration(page);

    await page.getByRole('button', { name: /^Search/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Search' });
    await dialog
      .getByPlaceholder('Search documentation…')
      .fill('Prerequisites');
    await dialog.getByRole('button', { name: 'Prerequisites' }).click();

    await expect(page).toHaveURL(/\/docs\/getting-started#prerequisites$/);
  });
});

test.describe('Sitemap', () => {
  test('lists the home page, the API Hub and every docs page', async ({
    request,
    baseURL,
  }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/xml');

    const locs = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1],
    );
    const docPages = getDocPagePaths().map((docPath) => `${baseURL}${docPath}`);

    expect(locs).toEqual(
      expect.arrayContaining([
        baseURL,
        `${baseURL}${PATH_API_HUB}`,
        ...docPages,
      ]),
    );
  });
});
