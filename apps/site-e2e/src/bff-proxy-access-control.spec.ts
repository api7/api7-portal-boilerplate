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
  API_PREFIX,
  API_PUBLIC_ACCESS,
  API_SUBSCRIPTIONS,
} from '@site/constants/api-prefix';

const API_PRODUCTS = `${API_PREFIX}/api_products`;
const API_DEVELOPERS = `${API_PREFIX}/developers`;

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

  // ─── 5. Platform-admin routes — non-admin → 404 ──────────────────────────────
  // /api/approvals is no longer a standalone proxy route (removed in favour of
  // Server Actions).  Any direct GET to /api/approvals now 404s regardless of
  // auth status, which is still secure: there is simply no route to abuse.
  test.describe('5. Platform-admin routes — /api/approvals removed → 404', () => {
    test('GET /api/approvals without session → 404', async () => {
      const ctx = await newGuestCtx();
      try {
        const res = await ctx.get(`${API_PREFIX}/approvals`, {
          failOnStatusCode: false,
        });
        expect(res.status()).toBe(404);
      } finally {
        await ctx.dispose();
      }
    });

    test('GET /api/approvals as regular authenticated user → 404', async ({ ctx }) => {
      const res = await ctx.get(`${API_PREFIX}/approvals`, {
        failOnStatusCode: false,
      });
      expect(res.status()).toBe(404);
    });
  });

  // ─── 6. Security regression — approval bypass via org-slug prefix ───────────
  // Org-slug-prefixed approval paths must NOT bypass the platform-admin check.
  // Old catch-all stripped the slug and forwarded /api/approvals with only an
  // org-membership check, allowing any org member to read/mutate approvals.
  test.describe('6. Security regression — approval bypass via org-slug prefix', () => {
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

  // ─── 7. Security regression — encoded-slash path traversal ──────────────────
  // Next.js decodes a catch-all segment (e.g. `..%2fapprovals` → `../approvals`)
  // *after* splitting the raw path, so a single validated segment like
  // `api_products`/`applications` can carry an embedded `../` or `..\` once
  // decoded. The routes used to join segments back into the upstream URL with
  // `proxy.join('/')` — axios/`new URL()` then collapsed the dot-segments,
  // silently retargeting the request outside the resource the allowlist / role
  // checks had approved.
  test.describe('7. Security regression — encoded-slash path traversal', () => {
    test.describe('unauthenticated api_products proxy', () => {
      const encodedTraversalCases: Array<[string, string]> = [
        ['..%2fapprovals', `${API_PRODUCTS}/..%2fapprovals`],
        ['..%2fdevelopers', `${API_PRODUCTS}/..%2fdevelopers`],
        ['..%2F..%2Fadmin%2Fanything', `${API_PRODUCTS}/..%2F..%2Fadmin%2Fanything`],
        // Backslash is an equally viable separator for http(s) URL parsing —
        // must be blocked the same way as the encoded-slash cases above.
        ['..%5capprovals', `${API_PRODUCTS}/..%5capprovals`],
        // Doubly-encoded: Next.js's single decode pass only unwraps the outer
        // `%25` (→ `%`), leaving a segment that still *looks* like `..%2f...`/
        // `..%5c...` rather than containing a real `/`/`\`. Harmless to our own
        // URL parsing, but must still be rejected — see safe-segment.ts.
        ['..%252fapprovals', `${API_PRODUCTS}/..%252fapprovals`],
        ['..%255capprovals', `${API_PRODUCTS}/..%255capprovals`],
        // Triple-encoded — the guard resolves encoding to a fixed point
        // rather than matching specific wrapped forms, so depth doesn't matter.
        ['..%25252fapprovals', `${API_PRODUCTS}/..%25252fapprovals`],
        // Nested seven layers deep on the wire: Next.js's own routing consumes
        // one decode pass before the guard ever sees the segment, so this
        // leaves it 6 layers deep — one beyond the guard's decode budget
        // (MAX_DECODE_ITERATIONS = 5 in safe-segment.ts). It must still be
        // rejected rather than treated as safe just because it never fully
        // resolves to a literal separator within that budget.
        ['..%2525252525252Fapprovals', `${API_PRODUCTS}/..%2525252525252Fapprovals`],
      ];

      for (const [label, url] of encodedTraversalCases) {
        test(`GET /api/api_products/${label} → 404 (must not reach ${label.replace(/%2[fF]|%5[cC]/g, '/')})`, async () => {
          const ctx = await newGuestCtx();
          try {
            const res = await ctx.get(url, { failOnStatusCode: false });
            expect(
              res.status(),
              `encoded-slash traversal must never reach the portal (got ${res.status()})`,
            ).toBe(404);
          } finally {
            await ctx.dispose();
          }
        });
      }
    });

    test.describe('authenticated org-scoped proxy', () => {
      test('GET /api/{slug}/api_products/..%2fapprovals as org member → 404', async ({ ctx }) => {
        const slug = await getActiveOrganizationSlug(ctx);
        const res = await ctx.get(
          `${API_PREFIX}/${slug}/api_products/..%2fapprovals`,
          { failOnStatusCode: false },
        );
        expect(
          res.status(),
          `encoded-slash traversal must never reach the portal (got ${res.status()})`,
        ).toBe(404);
      });

      test('GET /api/{slug}/api_products/..%2fdevelopers as org member → 404', async ({ ctx }) => {
        const slug = await getActiveOrganizationSlug(ctx);
        const res = await ctx.get(
          `${API_PREFIX}/${slug}/api_products/..%2fdevelopers`,
          { failOnStatusCode: false },
        );
        expect(
          res.status(),
          `encoded-slash traversal must never reach the portal (got ${res.status()})`,
        ).toBe(404);
      });

      // Write-method case: an org owner (any registered user can trivially
      // become one by creating their own organization) must not be able to
      // reach /api/approvals/{id}/accept through an `applications`-scoped
      // write. A single `..%2f` — not two — lands exactly on that path once
      // `applications/` is popped off; two levels would instead escape past
      // `/api` entirely and hit a route that doesn't exist either way, which
      // wouldn't actually prove this resource is unreachable.
      test('POST /api/{slug}/applications/..%2fapprovals/{id}/accept as org owner → 404', async ({
        ctx,
      }) => {
        const slug = await getActiveOrganizationSlug(ctx);
        const res = await ctx.post(
          `${API_PREFIX}/${slug}/applications/..%2fapprovals/fake-approval-id/accept`,
          { data: {}, failOnStatusCode: false },
        );
        expect(
          res.status(),
          `encoded-slash traversal must never reach the portal (got ${res.status()})`,
        ).toBe(404);
        // A fake approval ID would 404 whether the portal was reached or not,
        // so the status code alone can't tell blocked-at-the-BFF apart from
        // forwarded-and-then-404'd-by-the-portal. Every guard rejection in
        // this route returns `new NextResponse(null, ...)` — an empty body —
        // while a forwarded response always carries the portal's JSON payload
        // via `NextResponse.json(...)`. An empty body is proof the request
        // was never dispatched.
        expect(
          await res.text(),
          'a guard rejection must return an empty body, not a forwarded portal response',
        ).toBe('');
      });
    });
  });
});
