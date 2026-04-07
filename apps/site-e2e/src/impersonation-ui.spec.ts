import path from 'node:path';
import fs from 'node:fs';
import { Browser, expect, test } from '@playwright/test';
import { API_APPLICATIONS, AUTH_BASE_PATH } from '@site/constants/api-prefix';
import {
  PATH_APPLICATIONS,
  PATH_ORGANIZATION,
  PATH_ROOT,
} from '@site/constants/path-prefix';
import { ConfigMapData } from '@site/lib/config/schema';
import { E2E_TARGET_URL } from '../constant';
import {
  createOrganization,
  genCtx,
  getSession,
  login,
} from '../req/common';
import {
  getConfigMapYaml,
  patchConfigMapYaml,
  updateConfigMapYaml,
} from '../utils/devportal-config';
import { restartDevPortal, x } from '../utils/shell';

test.describe.configure({ mode: 'serial' });

const createAuth = (prefix: string) => {
  const id = `${prefix}-${Date.now()}`;
  return {
    email: `${id}@test.example.com`,
    password: `Password3412.${id}`,
    name: id,
    organization: `${id}-org`,
  };
};

const createPageWithStorageState = async (
  browser: Browser,
  storageStatePath: string,
  testInfo: { outputDir: string }
) => {
  const context = await browser.newContext({
    baseURL: E2E_TARGET_URL,
    storageState: storageStatePath,
    recordVideo: { dir: testInfo.outputDir },
  });
  const page = await context.newPage();
  return { context, page };
};

test.describe('Impersonation UI', () => {
  test.setTimeout(60_000);

  const adminAuth = createAuth('impersonation-admin');
  const ownerAuth = createAuth('impersonation-owner');
  const helperAuth = createAuth('impersonation-helper');
  const adminStorageStatePath = path.resolve(
    process.cwd(),
    `apps/site-e2e/test-results/.auth/${adminAuth.name}.json`
  );
  const ownerStorageStatePath = path.resolve(
    process.cwd(),
    `apps/site-e2e/test-results/.auth/${ownerAuth.name}.json`
  );

  let defaultConfig: string | null = null;
  let adminUserId = '';
  let ownerUserId = '';

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(600_000);
    fs.mkdirSync(path.dirname(adminStorageStatePath), { recursive: true });

    defaultConfig = await getConfigMapYaml();

    const adminCtx = await genCtx();
    await login(adminCtx, adminAuth);
    const adminSessionRes = await getSession(adminCtx);
    const adminSession = await adminSessionRes.json();
    adminUserId = adminSession.user.id;

    await patchConfigMapYaml<ConfigMapData>((configObj) => {
      configObj.auth.adminUserIds = Array.from(
        new Set([...(configObj.auth.adminUserIds || []), adminUserId])
      );
    });
    await restartDevPortal();

    const adminCtxAfterRestart = await genCtx();
    await login(adminCtxAfterRestart, adminAuth);
    await adminCtxAfterRestart.storageState({ path: adminStorageStatePath });
    await adminCtxAfterRestart.dispose();
    await adminCtx.dispose();

    const ownerCtx = await genCtx();
    await login(ownerCtx, ownerAuth);
    await createOrganization(ownerCtx, ownerAuth.organization);
    const ownerSessionRes = await getSession(ownerCtx);
    const ownerSession = await ownerSessionRes.json();
    ownerUserId = ownerSession.user.id;
    await ownerCtx.storageState({ path: ownerStorageStatePath });
    const ownerOrgId = ownerSession.session.activeOrganizationId;
    await ownerCtx.dispose();

    // Register a helper user and add them as a second owner in the org,
    // so the original owner can be safely downgraded to member.
    const helperCtx = await genCtx();
    await login(helperCtx, helperAuth);
    const helperSessionRes = await getSession(helperCtx);
    const helperSession = await helperSessionRes.json();
    const helperUserId = helperSession.user.id;
    await helperCtx.dispose();
    await x(
      `kubectl exec -n api7 api7-postgresql-0 -- env PGPASSWORD=changeme psql -U api7ee -d api7ee -c "INSERT INTO member (id, organization_id, user_id, role, created_at) VALUES ('helper-${Date.now()}', '${ownerOrgId}', '${helperUserId}', 'owner', NOW())"`
    );
  });

  test.afterAll(async () => {
    if (defaultConfig) {
      await updateConfigMapYaml(defaultConfig);
      await restartDevPortal();
    }
  });

  test('non-admin user should not access dashboard', async ({ browser }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      ownerStorageStatePath,
      testInfo
    );

    try {
      await page.goto(PATH_ROOT);
      await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);

      await page.goto('/dashboard/organizations');
      await expect(page).not.toHaveURL(/\/dashboard\/organizations(?:\?.*)?$/);
    } finally {
      await context.close();
    }
  });

  test('admin can impersonate owner and exit impersonation mode', async ({
    browser,
  }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStorageStatePath,
      testInfo
    );

    try {
      await page.goto(
        `/dashboard/organizations?search=${encodeURIComponent(ownerAuth.organization)}`
      );

      await expect(
        page.getByText('Organization Dashboard')
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
      const organizationRow = page
        .getByRole('row')
        .filter({
          has: page
            .getByRole('cell', { name: ownerAuth.organization })
            .first(),
        })
        .first();
      await expect(
        organizationRow.getByRole('cell', { name: ownerAuth.organization }).first()
      ).toBeVisible();

      await organizationRow
        .getByRole('button', { name: 'Impersonate' })
        .click();

      await expect(
        page.getByText('Currently in Impersonation Mode')
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);

      const impersonatedSessionRes = await page.request.get(
        `${AUTH_BASE_PATH}/get-session`,
        { failOnStatusCode: false }
      );
      expect(impersonatedSessionRes.status()).toBe(200);
      const impersonatedSession = await impersonatedSessionRes.json();
      expect(impersonatedSession.user.id).toBe(ownerUserId);
      expect(impersonatedSession.session.impersonatedBy).toBe(adminUserId);

      await page.goto('/dashboard/organizations');
      await expect(page).not.toHaveURL(/\/dashboard\/organizations(?:\?.*)?$/);

      await page.getByRole('button', { name: 'Exit Impersonation' }).click();
      await expect(
        page.getByText('Currently in Impersonation Mode')
      ).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

      const restoredSessionRes = await page.request.get(
        `${AUTH_BASE_PATH}/get-session`,
        { failOnStatusCode: false }
      );
      expect(restoredSessionRes.status()).toBe(200);
      const restoredSession = await restoredSessionRes.json();
      expect(restoredSession.user.id).toBe(adminUserId);
      expect(restoredSession.session.impersonatedBy || null).toBeNull();
    } finally {
      await context.close();
    }
  });

  test('impersonated owner downgraded to member loses write permissions', async ({
    browser,
  }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStorageStatePath,
      testInfo
    );

    try {
      // Step 1: Admin starts impersonation of the owner
      await page.goto(
        `/dashboard/organizations?search=${encodeURIComponent(ownerAuth.organization)}`
      );
      const organizationRow = page
        .getByRole('row')
        .filter({
          has: page
            .getByRole('cell', { name: ownerAuth.organization })
            .first(),
        })
        .first();
      await organizationRow
        .getByRole('button', { name: 'Impersonate' })
        .click();
      await expect(
        page.getByText('Currently in Impersonation Mode')
      ).toBeVisible();

      // Get orgId early so we can restore the role in finally
      const sessionRes = await page.request.get(
        `${AUTH_BASE_PATH}/get-session`,
        { failOnStatusCode: false }
      );
      const session = await sessionRes.json();
      const orgId = session.session.activeOrganizationId;

      try {
        // Step 2: Downgrade owner to member via the Members UI
        await page.goto(`${PATH_ORGANIZATION}/members`);
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: path.join(testInfo.outputDir, 'members-page.png') });
        // Find the owner's card by their email and click the ⋯ menu
        const ownerCard = page
          .locator('[data-slot="card-content"] [data-slot="card"]')
          .filter({ hasText: ownerAuth.email });
        await expect(ownerCard).toBeVisible({ timeout: 10_000 });
        // The ⋯ button has no aria-label; use the dropdown menu trigger
        await ownerCard.locator('[data-slot="dropdown-menu-trigger"]').click();
        await page.getByRole('menuitem', { name: 'Update Role' }).click();

        // In the Update Role dialog, select "Member" role
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('combobox').click();
        await page.getByRole('option', { name: 'Member' }).click();
        await dialog.getByRole('button', { name: 'Update Role' }).click();
        await expect(dialog).toBeHidden();

        // Step 3: Verify UI buttons are disabled on the applications page
        await page.goto(PATH_APPLICATIONS);
        await expect(
          page.getByRole('button', { name: 'Add Application' })
        ).toBeDisabled();

        // Verify the actions menu (more button) is also disabled
        const moreBtn = page.getByTestId('more').first();
        if (await moreBtn.isVisible()) {
          await expect(moreBtn).toBeDisabled();
        }

        // Step 4: Write operations should return 403
        const createAppRes = await page.request.post(API_APPLICATIONS, {
          data: { name: `test-app-after-downgrade-${Date.now()}` },
          failOnStatusCode: false,
        });
        expect(createAppRes.status()).toBe(403);

        // Step 5: Impersonation session remains active despite role change
        await expect(
          page.getByText('Currently in Impersonation Mode')
        ).toBeVisible();
      } finally {
        // Step 6: Restore owner role via DB (always runs)
        await x(
          `kubectl exec -n api7 api7-postgresql-0 -- env PGPASSWORD=changeme psql -U api7ee -d api7ee -c "UPDATE member SET role = 'owner' WHERE user_id = '${ownerUserId}' AND organization_id = '${orgId}'"`
        );
      }

      await page.getByRole('button', { name: 'Exit Impersonation' }).click();
      await expect(
        page.getByText('Currently in Impersonation Mode')
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('impersonated owner gets banned - session becomes invalid', async ({
    browser,
  }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStorageStatePath,
      testInfo
    );

    try {
      // Step 1: Admin starts impersonation of the owner
      await page.goto(
        `/dashboard/organizations?search=${encodeURIComponent(ownerAuth.organization)}`
      );
      const organizationRow = page
        .getByRole('row')
        .filter({
          has: page
            .getByRole('cell', { name: ownerAuth.organization })
            .first(),
        })
        .first();
      await organizationRow
        .getByRole('button', { name: 'Impersonate' })
        .click();
      await expect(
        page.getByText('Currently in Impersonation Mode')
      ).toBeVisible();

      // Step 2: Ban the owner using a separate admin context
      const adminCtx = await genCtx();
      try {
        await login(adminCtx, adminAuth);
        const banRes = await adminCtx.post(`${AUTH_BASE_PATH}/admin/ban-user`, {
          data: { userId: ownerUserId },
          failOnStatusCode: false,
        });
        expect(banRes.status()).toBe(200);

        // Step 3: Session should become invalid (get-session returns null body)
        const sessionAfterBanRes = await page.request.get(
          `${AUTH_BASE_PATH}/get-session`,
          { failOnStatusCode: false }
        );
        expect(sessionAfterBanRes.status()).toBe(200);
        const sessionBody = await sessionAfterBanRes.json();
        expect(sessionBody).toBeNull();

        // Step 4: After reload, impersonation banner disappears (logged out state)
        await page.reload();
        await page.waitForLoadState('networkidle');
        await expect(
          page.getByText('Currently in Impersonation Mode')
        ).toHaveCount(0);
      } finally {
        await adminCtx.post(`${AUTH_BASE_PATH}/admin/unban-user`, {
          data: { userId: ownerUserId },
          failOnStatusCode: false,
        }).catch(() => {});
        await adminCtx.dispose();
      }
    } finally {
      await context.close();
    }
  });
});
