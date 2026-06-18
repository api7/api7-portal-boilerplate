import { expect, request, test } from '@playwright/test';
import {
  API_APPLICATIONS,
  API_CREDENTIALS,
  API_DEVELOPERS,
  API_PRODUCTS,
  API_PUBLIC_ACCESS,
  API_SUBSCRIPTIONS,
} from '@site/constants/api-prefix';
import { E2E_TARGET_URL } from '../../constant';

test.describe('Guest access to BFF proxy routes', () => {
  const baseURL = E2E_TARGET_URL;

  async function newCtx() {
    return request.newContext({
      baseURL,
      extraHTTPHeaders: { origin: baseURL },
    });
  }

  test('GET /api/api_products is accessible without session', async () => {
    const ctx = await newCtx();
    try {
      const res = await ctx.get(API_PRODUCTS, { failOnStatusCode: false });
      expect(res.status()).toBe(200);
    } finally {
      await ctx.dispose();
    }
  });

  test('GET /api/developers returns 404 (route does not exist)', async () => {
    const ctx = await newCtx();
    try {
      const res = await ctx.get(API_DEVELOPERS, { failOnStatusCode: false });
      expect(res.status()).toBe(404);
    } finally {
      await ctx.dispose();
    }
  });

  test('GET /api/system_settings/public_access returns 404 (route does not exist)', async () => {
    const ctx = await newCtx();
    try {
      const res = await ctx.get(API_PUBLIC_ACCESS, { failOnStatusCode: false });
      expect(res.status()).toBe(404);
    } finally {
      await ctx.dispose();
    }
  });

  for (const [name, path] of [
    ['applications', API_APPLICATIONS],
    ['credentials', API_CREDENTIALS],
    ['subscriptions', API_SUBSCRIPTIONS],
  ] as const) {
    test(`GET /api/${name} without slug returns 404 (org-scoped resource requires slug)`, async () => {
      const ctx = await newCtx();
      try {
        const res = await ctx.get(path, { failOnStatusCode: false });
        expect(res.status()).toBe(404);
      } finally {
        await ctx.dispose();
      }
    });
  }
});
