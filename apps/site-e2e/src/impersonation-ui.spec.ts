import fs from 'node:fs';
import path from 'node:path';

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
  acceptInvitationViaUI,
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
import { restartDevPortal } from '../utils/shell';

const ORG_LIST_MEMBERS = `${AUTH_BASE_PATH}/organization/list-members`;
const ORG_CREATE_INVITATION = `${AUTH_BASE_PATH}/organization/invite-member`;
const ORG_ACCEPT_INVITATION = `${AUTH_BASE_PATH}/organization/accept-invitation`;
const ORG_SET_ACTIVE = `${AUTH_BASE_PATH}/organization/set-active`;
const ORG_UPDATE_MEMBER_ROLE = `${AUTH_BASE_PATH}/organization/update-member-role`;

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
  testInfo: { outputDir: string },
) => {
  const context = await browser.newContext({
    baseURL: E2E_TARGET_URL,
    storageState: storageStatePath,
    recordVideo: { dir: testInfo.outputDir },
  });
  const page = await context.newPage();
  return { context, page };
};

const listOrganizationMembers = async (
  ctx: Awaited<ReturnType<typeof genCtx>>,
  organizationId: string,
) => {
  const res = await ctx.get(
    `${ORG_LIST_MEMBERS}?organizationId=${encodeURIComponent(organizationId)}`,
    { failOnStatusCode: false },
  );
  expect(res.status()).toBe(200);
  const body = await res.json();
  return (body.members ?? []) as Array<{
    id: string;
    userId: string;
    role: string;
  }>;
};

const getOrganizationMemberId = async (
  ctx: Awaited<ReturnType<typeof genCtx>>,
  organizationId: string,
  userId: string,
) => {
  const members = await listOrganizationMembers(ctx, organizationId);
  const member = members.find((item) => item.userId === userId);
  expect(member?.id).toBeTruthy();
  return member!.id;
};

const updateOrganizationMemberRole = async (
  ctx: Awaited<ReturnType<typeof genCtx>>,
  organizationId: string,
  memberId: string,
  role: 'owner' | 'admin' | 'member',
) => {
  const res = await ctx.post(ORG_UPDATE_MEMBER_ROLE, {
    data: {
      organizationId,
      memberId,
      role,
    },
    failOnStatusCode: false,
  });
  expect(res.status()).toBe(200);
  return await res.json();
};

test.describe('Impersonation UI', () => {
  test.setTimeout(60_000);

  const adminAuth = createAuth('impersonation-admin');
  const ownerAuth = createAuth('impersonation-owner');
  const helperAuth = createAuth('impersonation-helper');
  const adminStorageStatePath = path.resolve(
    process.cwd(),
    `apps/site-e2e/test-results/.auth/${adminAuth.name}.json`,
  );
  const ownerStorageStatePath = path.resolve(
    process.cwd(),
    `apps/site-e2e/test-results/.auth/${ownerAuth.name}.json`,
  );
  const helperStorageStatePath = path.resolve(
    process.cwd(),
    `apps/site-e2e/test-results/.auth/${helperAuth.name}.json`,
  );

  let defaultConfig: string | null = null;
  let adminUserId = '';
  let ownerUserId = '';
  let ownerOrganizationId = '';
  let ownerOrganizationSlug = '';
  let helperUserId = '';

  test.beforeAll(async ({ browser }, testInfo) => {
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
        new Set([...(configObj.auth.adminUserIds || []), adminUserId]),
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
    const ownerOrganization = await createOrganization(
      ownerCtx,
      ownerAuth.organization,
    );
    const ownerSessionRes = await getSession(ownerCtx);
    const ownerSession = await ownerSessionRes.json();
    ownerUserId = ownerSession.user.id;
    await ownerCtx.storageState({ path: ownerStorageStatePath });
    ownerOrganizationId = ownerSession.session.activeOrganizationId;
    ownerOrganizationSlug = ownerOrganization.slug;
    await ownerCtx.dispose();

    const helperCtx = await genCtx();
    try {
      await login(helperCtx, helperAuth);

      const helperSessionRes = await getSession(helperCtx);
      const helperSession = await helperSessionRes.json();
      helperUserId = helperSession.user.id;
      await helperCtx.storageState({ path: helperStorageStatePath });
    } finally {
      await helperCtx.dispose();
    }

    const ownerRoleCtx = await genCtx({ storageState: ownerStorageStatePath });
    try {
      const inviteRes = await ownerRoleCtx.post(ORG_CREATE_INVITATION, {
        data: {
          email: helperAuth.email,
          role: 'admin',
          organizationId: ownerOrganizationId,
        },
        failOnStatusCode: false,
      });
      expect(inviteRes.status()).toBe(200);
      const invitation = await inviteRes.json();

      const helperAcceptCtx = await genCtx();
      try {
        await login(helperAcceptCtx, helperAuth);
        const acceptRes = await helperAcceptCtx.post(ORG_ACCEPT_INVITATION, {
          data: { invitationId: invitation.id },
          failOnStatusCode: false,
        });
        expect(acceptRes.status()).toBe(200);

        const setActiveRes = await helperAcceptCtx.post(ORG_SET_ACTIVE, {
          data: { organizationId: ownerOrganizationId },
          failOnStatusCode: false,
        });
        expect(setActiveRes.status()).toBe(200);
      } finally {
        await helperAcceptCtx.dispose();
      }
    } finally {
      await ownerRoleCtx.dispose();
    }

    const promoteHelperCtx = await genCtx({
      storageState: ownerStorageStatePath,
    });
    try {
      const helperMemberId = await getOrganizationMemberId(
        promoteHelperCtx,
        ownerOrganizationId,
        helperUserId,
      );
      await updateOrganizationMemberRole(
        promoteHelperCtx,
        ownerOrganizationId,
        helperMemberId,
        'owner',
      );
    } finally {
      await promoteHelperCtx.dispose();
    }
  });

  test.afterAll(async () => {
    if (defaultConfig) {
      await updateConfigMapYaml(defaultConfig);
      await restartDevPortal();
    }
  });

  test('non-admin user should not access dashboard', async ({
    browser,
  }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      ownerStorageStatePath,
      testInfo,
    );

    try {
      await page.goto(PATH_ROOT);
      await page.getByRole('button', { name: 'Account' }).click();
      await expect(page.getByRole('menuitem', { name: 'Admin' })).toHaveCount(0);
      await page.keyboard.press('Escape');

      await page.goto('/admin/organizations');
      await expect(page).not.toHaveURL(/\/admin\/organizations(?:\?.*)?$/);
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
      testInfo,
    );

    try {
      await page.goto(
        `/admin/organizations?search=${encodeURIComponent(ownerAuth.organization)}`,
      );

      await expect(page.getByRole('main').getByText('Organizations', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Account' }).click();
      await expect(page.getByRole('menuitem', { name: 'Admin' })).toBeVisible();
      await page.keyboard.press('Escape');
      const organizationRow = page
        .getByRole('row')
        .filter({
          has: page.getByRole('cell', { name: ownerAuth.organization }).first(),
        })
        .first();
      await expect(
        organizationRow
          .getByRole('cell', { name: ownerAuth.organization })
          .first(),
      ).toBeVisible();

      await organizationRow
        .getByRole('button', { name: 'Impersonate' })
        .click();

      await expect(
        page.getByText('Currently in Impersonation Mode'),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Account' }).click();
      await expect(page.getByRole('menuitem', { name: 'Admin' })).toHaveCount(0);
      await page.keyboard.press('Escape');

      const impersonatedSessionRes = await page.request.get(
        `${AUTH_BASE_PATH}/get-session`,
        { failOnStatusCode: false },
      );
      expect(impersonatedSessionRes.status()).toBe(200);
      const impersonatedSession = await impersonatedSessionRes.json();
      expect(impersonatedSession.user.id).toBe(ownerUserId);
      expect(impersonatedSession.session.impersonatedBy).toBe(adminUserId);

      await page.goto('/admin/organizations');
      await expect(page).not.toHaveURL(/\/admin\/organizations(?:\?.*)?$/);

      await page.getByRole('button', { name: 'Exit Impersonation' }).click();
      await expect(
        page.getByText('Currently in Impersonation Mode'),
      ).toHaveCount(0);
      await page.getByRole('button', { name: 'Account' }).click();
      await expect(page.getByRole('menuitem', { name: 'Admin' })).toBeVisible();
      await page.keyboard.press('Escape');

      const restoredSessionRes = await page.request.get(
        `${AUTH_BASE_PATH}/get-session`,
        { failOnStatusCode: false },
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
      testInfo,
    );

    try {
      // Step 1: Admin starts impersonation of the owner
      await page.goto(
        `/admin/organizations?search=${encodeURIComponent(ownerAuth.organization)}`,
      );
      const organizationRow = page
        .getByRole('row')
        .filter({
          has: page.getByRole('cell', { name: ownerAuth.organization }).first(),
        })
        .first();
      await organizationRow
        .getByRole('button', { name: 'Impersonate' })
        .click();
      await expect(
        page.getByText('Currently in Impersonation Mode'),
      ).toBeVisible();

      const helperCtx = await genCtx();
      await login(helperCtx, helperAuth);
      const setActiveRes = await helperCtx.post(ORG_SET_ACTIVE, {
        data: { organizationId: ownerOrganizationId },
        failOnStatusCode: false,
      });
      expect(setActiveRes.status()).toBe(200);

      try {
        // Step 2: Downgrade owner to member via a separate owner session.
        const ownerMemberId = await getOrganizationMemberId(
          helperCtx,
          ownerOrganizationId,
          ownerUserId,
        );
        await updateOrganizationMemberRole(
          helperCtx,
          ownerOrganizationId,
          ownerMemberId,
          'member',
        );

        // Step 3: Verify UI buttons are disabled on the applications page
        await page.goto(PATH_APPLICATIONS);
        await expect(
          page.getByRole('button', { name: 'Add Application' }),
        ).toBeDisabled();

        // Verify the actions menu (more button) is also disabled
        const moreBtn = page.getByTestId('more').first();
        if (await moreBtn.isVisible()) {
          await expect(moreBtn).toBeDisabled();
        }

        // Step 4: Write operations should return 403
        const createAppRes = await page.request.post(
          `/api/${ownerOrganizationSlug}/applications`,
          {
            data: { name: `test-app-after-downgrade-${Date.now()}` },
            failOnStatusCode: false,
          },
        );
        expect(createAppRes.status()).toBe(403);

        // Step 5: Impersonation session remains active despite role change
        await expect(
          page.getByText('Currently in Impersonation Mode'),
        ).toBeVisible();
      } finally {
        const cleanupErrors: string[] = [];
        try {
          const ownerMemberId = await getOrganizationMemberId(
            helperCtx,
            ownerOrganizationId,
            ownerUserId,
          );
          if (ownerMemberId) {
            await updateOrganizationMemberRole(
              helperCtx,
              ownerOrganizationId,
              ownerMemberId,
              'owner',
            );
          }
        } catch (error) {
          cleanupErrors.push(
            `restore owner role failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        await helperCtx.dispose();
        if (cleanupErrors.length > 0) {
          throw new Error(cleanupErrors.join('; '));
        }
      }

      await page.getByRole('button', { name: 'Exit Impersonation' }).click();
      await expect(
        page.getByText('Currently in Impersonation Mode'),
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
      testInfo,
    );

    try {
      // Step 1: Admin starts impersonation of the owner
      await page.goto(
        `/admin/organizations?search=${encodeURIComponent(ownerAuth.organization)}`,
      );
      const organizationRow = page
        .getByRole('row')
        .filter({
          has: page.getByRole('cell', { name: ownerAuth.organization }).first(),
        })
        .first();
      await organizationRow
        .getByRole('button', { name: 'Impersonate' })
        .click();
      await expect(
        page.getByText('Currently in Impersonation Mode'),
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
          { failOnStatusCode: false },
        );
        expect(sessionAfterBanRes.status()).toBe(200);
        const sessionBody = await sessionAfterBanRes.json();
        expect(sessionBody).toBeNull();

        // Step 4: After reload, impersonation banner disappears (logged out state)
        await page.reload();
        await page.waitForLoadState('networkidle');
        await expect(
          page.getByText('Currently in Impersonation Mode'),
        ).toHaveCount(0);
      } finally {
        const unbanRes = await adminCtx.post(
          `${AUTH_BASE_PATH}/admin/unban-user`,
          {
            data: { userId: ownerUserId },
            failOnStatusCode: false,
          },
        );
        expect(unbanRes.status()).toBe(200);
        await adminCtx.dispose();
      }
    } finally {
      await context.close();
    }
  });
});
