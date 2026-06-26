import { expect, test } from '@playwright/test';

/**
 * Verifies that the `llms` frontmatter field controls visibility in the two
 * aggregated LLM-facing doc endpoints:
 *
 *   /llms.txt       — flat page index used by LLM crawlers
 *   /llms-full.txt  — full page content for each doc, concatenated
 *
 * /llms.mdx/docs/[slug] mirrors the regular /docs/[slug] route and is not
 * filtered — if a page is accessible in the docs, it is accessible there too.
 *
 * Test fixture:
 *   - llms-configuration.mdx has `llms: false` → absent from aggregated outputs
 *   - getting-started.mdx has no `llms` field (defaults true) → present
 *
 * These routes are fully public — no login or backend is required.
 */
test.describe('docs LLM endpoints respect the `llms` frontmatter field', () => {
  test('llms.txt includes pages without llms:false', async ({ request }) => {
    const res = await request.get('/llms.txt');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('/docs/getting-started');
  });

  test('llms.txt excludes pages with llms:false', async ({ request }) => {
    const res = await request.get('/llms.txt');
    expect(res.status()).toBe(200);
    expect(await res.text()).not.toContain('/docs/llms-configuration');
  });

  test('llms-full.txt includes pages without llms:false', async ({ request }) => {
    const res = await request.get('/llms-full.txt');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('/docs/getting-started');
  });

  test('llms-full.txt excludes pages with llms:false', async ({ request }) => {
    const res = await request.get('/llms-full.txt');
    expect(res.status()).toBe(200);
    expect(await res.text()).not.toContain('/docs/llms-configuration');
  });
});
