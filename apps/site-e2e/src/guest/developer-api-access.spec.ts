import { expect, request, test } from '@playwright/test';
import { API_DEVELOPERS } from '@site/constants/api-prefix';
import { E2E_TARGET_URL } from '../../constant';

test.describe('Guest access to developer APIs', () => {
  const baseURL = E2E_TARGET_URL;

  test('guest GET /api/developers returns 401', async () => {
    const ctx = await request.newContext({
      baseURL,
      extraHTTPHeaders: {
        origin: baseURL,
      },
    });
    try {
      const res = await ctx.get(API_DEVELOPERS, {
        failOnStatusCode: false,
      });

      expect(res.status()).toBe(401);
      await expect(res.json()).resolves.toMatchObject({
        message: 'Unauthorized. Sign in is required for developer APIs.',
      });
    } finally {
      await ctx.dispose();
    }
  });

  test('guest POST /api/developers returns 401', async () => {
    const ctx = await request.newContext({
      baseURL,
      extraHTTPHeaders: {
        origin: baseURL,
      },
    });
    try {
      const res = await ctx.post(API_DEVELOPERS, {
        data: {
          developer_id: `guest-blocked-${Date.now()}`,
        },
        failOnStatusCode: false,
      });

      expect(res.status()).toBe(401);
      await expect(res.json()).resolves.toMatchObject({
        message: 'Unauthorized. Sign in is required for developer APIs.',
      });
    } finally {
      await ctx.dispose();
    }
  });
});
