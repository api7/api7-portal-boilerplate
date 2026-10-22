import { type APIRequestContext, expect, test } from '@playwright/test';
import { PATH_API_HUB } from '@site/constants/path-prefix';

test.use({ storageState: { cookies: [], origins: [] } });

type SearchSection = {
  id: string;
  url: string;
  type: 'page' | 'heading' | 'text';
  content: string;
  pageTitle: string;
};

const getSearchIndex = async (request: APIRequestContext) => {
  const res = await request.get('/api/docs-search');
  expect(res.status()).toBe(200);
  return (await res.json()) as SearchSection[];
};

test.describe('Docs search', () => {
  test('the search index lists every docs page with its headings', async ({
    request,
  }) => {
    const index = await getSearchIndex(request);
    const pages = index.filter((section) => section.type === 'page');

    expect(pages.map((page) => page.url)).toEqual(
      expect.arrayContaining(['/docs', '/docs/getting-started']),
    );
    for (const page of pages) {
      expect(page.pageTitle).toBeTruthy();
    }
    expect(
      index.some(
        (section) =>
          section.type === 'heading' &&
          section.url === '/docs/getting-started#prerequisites',
      ),
    ).toBe(true);
  });

  test('searching from the docs opens the matching section', async ({
    page,
  }) => {
    await page.goto('/docs');
    await page.waitForLoadState('networkidle');

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
    const docPages = (await getSearchIndex(request))
      .filter((section) => section.type === 'page')
      .map((section) => `${baseURL}${section.url}`);

    expect(locs).toEqual(
      expect.arrayContaining([
        baseURL,
        `${baseURL}${PATH_API_HUB}`,
        ...docPages,
      ]),
    );
  });
});
