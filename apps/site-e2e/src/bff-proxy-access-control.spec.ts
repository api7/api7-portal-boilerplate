/**
 * BFF Proxy — Route Access Control
 *
 * Exhaustive coverage of every proxy scope:
 *   1. Public routes — no auth required
 *   2. Non-proxied routes — always 404 (not in allowlist)
 *   3. Org-scoped routes — session required (unauthenticated → 401)
 *   4. Org-scoped writes — owner/admin only (member → 403)
 *   5. Platform-admin routes — non-admin users → 403
 */
import fs from 'node:fs';
import path from 'node:path';

import { expect, request } from '@playwright/test';
import {
  API_APPLICATIONS,
  API_CREDENTIALS,
  API_DEVELOPERS,
  API_PREFIX,
  API_PRODUCTS,
  API_PUBLIC_ACCESS,
  API_SUBSCRIPTIONS,
} from '@site/constants/api-prefix';

import { E2E_TARGET_URL } from '../constant';
import { test } from '../fixture';
import {
  genCtx,
  getActiveOrganizationId,
  getActiveOrganizationSlug,
  setupMemberUser,
} from '../req/common';

const newGuestCtx = () =>
  request.newContext({
    baseURL: E2E_TARGET_URL,
    extraHTTPHeaders: { origin: E2E_TARGET_URL },
    storageState: { cookies: [], origins: [] },
  });

test.describe('BFF Proxy — Route Access Control', () => {
  // ─── 1. Public routes ────────────────────────────────────────────────────────
  test.describe('1. Public routes — accessible without authentication', () => {
    test('GET /api/api_products returns 2xx', async () => {
      const ctx = await newGuestCtx();
      try {
        const res = await ctx.get(API_PRODUCTS, { failOnStatusCode: false });
        const status = res.status();
        expect(status >= 200 && status < 300, 'api_products should return 2xx').toBe(true);
      } finally {
        await ctx.dispose();
      }
    });

    test('GET /api/api_products/{id} is not auth-blocked (404 from portal is acceptable)', async () => {
      const ctx = await newGuestCtx();
      try {
        const res = await ctx.get(`${API_PRODUCTS}/nonexistent-id`, {
          failOnStatusCode: false,
        });
        expect(res.status(), 'api_products detail should not require auth').not.toBe(401);
      } finally {
        await ctx.dispose();
      }
    });
  });

  // ─── 2. Non-proxied routes — always 404 ──────────────────────────────────────
  test.describe('2. Non-proxied routes — always 404', () => {
    const notFoundCases: Array<[string, string]> = [
      ['developers endpoint', API_DEVELOPERS],
      ['system_settings/public_access', API_PUBLIC_ACCESS],
      ['applications without org slug', API_APPLICATIONS],
      ['credentials without org slug', API_CREDENTIALS],
      ['subscriptions without org slug', API_SUBSCRIPTIONS],
      ['dcr_providers without org slug', `${API_PREFIX}/dcr_providers`],
      ['unknown top-level resource', `${API_PREFIX}/unknown_resource`],
    ];

    for (const [label, url] of notFoundCases) {
      test(`GET ${label} → 404`, async () => {
        const ctx = await newGuestCtx();
        try {
          const res = await ctx.get(url, { failOnStatusCode: false });
          expect(res.status(), `${url} should return 404`).toBe(404);
        } finally {
          await ctx.dispose();
        }
      });
    }

    test('GET /api/{slug}/unknown_resource → 404 (not in proxy allowlist)', async () => {
      const ctx = await newGuestCtx();
      try {
        // Resource allowlist check runs before session check, so guest context suffices.
        const res = await ctx.get(`${API_PREFIX}/any-org/unknown_resource`, {
          failOnStatusCode: false,
        });
        expect(res.status()).toBe(404);
      } finally {
        await ctx.dispose();
      }
    });
  });

  // ─── 3. Org-scoped routes — session required ─────────────────────────────────
  test.describe('3. Org-scoped routes — session required', () => {
    const orgScopedResources = [
      'applications',
      'credentials',
      'subscriptions',
      'dcr_providers',
      'api_products',
    ] as const;

    // Use a real org slug so the route definitely matches — fake slugs can return
    // 404 from the org-not-found check if the session check is bypassed.
    test('all org-scoped resources require session → 401', async ({ ctx }) => {
      const slug = await getActiveOrganizationSlug(ctx);
      const guestCtx = await newGuestCtx();
      try {
        for (const resource of orgScopedResources) {
          const res = await guestCtx.get(`${API_PREFIX}/${slug}/${resource}`, {
            failOnStatusCode: false,
          });
          expect(res.status(), `/${resource} without session should be 401`).toBe(401);
        }
      } finally {
        await guestCtx.dispose();
      }
    });

    test('GET /api/{slug}/applications with valid session → 200', async ({ ctx }) => {
      const slug = await getActiveOrganizationSlug(ctx);
      const res = await ctx.get(`${API_PREFIX}/${slug}/applications`, {
        failOnStatusCode: false,
      });
      expect(res.status()).toBe(200);
    });

    test('GET /api/{slug}/api_products with valid session → 200', async ({ ctx }) => {
      const slug = await getActiveOrganizationSlug(ctx);
      const res = await ctx.get(`${API_PREFIX}/${slug}/api_products`, {
        failOnStatusCode: false,
      });
      expect(res.status()).toBe(200);
    });
  });

  // ─── 4. Org-scoped writes — owner/admin role required ────────────────────────
  test.describe('4. Org-scoped write operations — owner/admin role required', () => {
    test(
      'member: POST to write-protected resources → all 403; owner → not 403',
      async ({ ctx, page }) => {
        const testId = `bff-proxy-member-${Date.now()}`;
        const memberAuth = {
          email: `${testId}@test.example.com`,
          password: `Password3412.${testId}`,
          name: testId,
        };

        const ownerSlug = await getActiveOrganizationSlug(ctx);
        const orgId = await getActiveOrganizationId(ctx);

        const outputDir = test.info().project.outputDir;
        const memberStatePath = path.resolve(
          outputDir,
          '.auth',
          `${testId}.json`,
        );
        fs.mkdirSync(path.dirname(memberStatePath), { recursive: true });
        await setupMemberUser(page, memberAuth, orgId, memberStatePath);

        const memberCtx = await genCtx({
          storageState: memberStatePath,
          extraHTTPHeaders: { origin: E2E_TARGET_URL },
        });

        try {
          const appRes = await memberCtx.post(
            `${API_PREFIX}/${ownerSlug}/applications`,
            { data: { name: 'Blocked', desc: 'test' }, failOnStatusCode: false },
          );
          expect(appRes.status(), 'member POST /applications should be 403').toBe(403);

          const credRes = await memberCtx.post(
            `${API_PREFIX}/${ownerSlug}/credentials`,
            {
              data: { name: 'Blocked', auth_method: 'key-auth', application_id: 'fake' },
              failOnStatusCode: false,
            },
          );
          expect(credRes.status(), 'member POST /credentials should be 403').toBe(403);

          const subRes = await memberCtx.post(
            `${API_PREFIX}/${ownerSlug}/subscriptions`,
            {
              data: { api_products: ['fake'], applications: ['fake'] },
              failOnStatusCode: false,
            },
          );
          expect(subRes.status(), 'member POST /subscriptions should be 403').toBe(403);

          const dcrRes = await memberCtx.post(
            `${API_PREFIX}/${ownerSlug}/dcr_providers`,
            { data: { name: 'Blocked' }, failOnStatusCode: false },
          );
          expect(dcrRes.status(), 'POST /dcr_providers should be 405 (write not supported)').toBe(405);

          const productRes = await memberCtx.post(
            `${API_PREFIX}/${ownerSlug}/api_products`,
            { data: { name: 'Blocked' }, failOnStatusCode: false },
          );
          expect(productRes.status(), 'POST /api_products should be 405 (write not supported)').toBe(405);
        } finally {
          await memberCtx.dispose();
        }

        // Owner: role check passes; portal rejects empty name with 400/422.
        const ownerRes = await ctx.post(`${API_PREFIX}/${ownerSlug}/applications`, {
          data: { name: '' },
          failOnStatusCode: false,
        });
        const ownerStatus = ownerRes.status();
        expect(ownerStatus).not.toBe(401);
        expect(ownerStatus).not.toBe(403);
        expect(ownerStatus, 'owner POST /applications should not return server error').toBeLessThan(500);
      },
    );
  });

  // ─── 5. Platform-admin routes — non-admin → 403 ──────────────────────────────
  test.describe('5. Platform-admin routes — non-admin users → 403', () => {
    test('GET /api/approvals without session → 403', async () => {
      const ctx = await newGuestCtx();
      try {
        const res = await ctx.get(`${API_PREFIX}/approvals`, {
          failOnStatusCode: false,
        });
        expect(res.status()).toBe(403);
      } finally {
        await ctx.dispose();
      }
    });

    test('GET /api/approvals as regular authenticated user → 403', async ({ ctx }) => {
      const res = await ctx.get(`${API_PREFIX}/approvals`, {
        failOnStatusCode: false,
      });
      expect(res.status()).toBe(403);
    });
  });

  // ─── 6. Security regression — issue #450 ────────────────────────────────────
  // Org-slug-prefixed approval paths must NOT bypass the platform-admin check.
  // Old catch-all stripped the slug and forwarded /api/approvals with only an
  // org-membership check, allowing any org member to read/mutate approvals.
  test.describe('6. Security regression #450 — approval bypass via org-slug prefix', () => {
    test('GET /api/{slug}/approvals as org member → 404 (not in org-scope allowlist)', async ({ ctx }) => {
      const slug = await getActiveOrganizationSlug(ctx);
      const res = await ctx.get(`${API_PREFIX}/${slug}/approvals`, {
        failOnStatusCode: false,
      });
      expect(
        res.status(),
        `slug-prefixed /approvals must never reach the portal (got ${res.status()})`,
      ).toBe(404);
    });

    test('POST /api/{slug}/approvals/{id}/accept as org member → 404', async ({ ctx }) => {
      const slug = await getActiveOrganizationSlug(ctx);
      const res = await ctx.post(
        `${API_PREFIX}/${slug}/approvals/fake-approval-id/accept`,
        { data: {}, failOnStatusCode: false },
      );
      expect(
        res.status(),
        `slug-prefixed approval action must never reach the portal (got ${res.status()})`,
      ).toBe(404);
    });
  });
});
