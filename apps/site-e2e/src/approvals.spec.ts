import fs from 'node:fs';
import path from 'node:path';

import { Browser, Page, expect } from '@playwright/test';
import { API_PREFIX } from '@site/constants/api-prefix';
import { PATH_APPROVALS } from '@site/constants/path-prefix';
import { ConfigMapData } from '@site/lib/config/schema';

import { E2E_TARGET_URL } from '../constant';
import { test } from '../fixture';
import {
  createApplication,
  createOrganization,
  genCtx,
  getSession,
  login,
} from '../req/common';
import {
  a7DeleteProductList,
  a7PostGatewayProduct,
  httpbinRawOAS,
} from '../req/dashboard/product';
import {
  a7DeletePublishedRoute,
  a7PostPublishedRoute,
} from '../req/dashboard/route';
import {
  a7DeleteService,
  a7PostPublishedService,
  a7PutServiceOAS,
} from '../req/dashboard/service';
import {
  getConfigMapYaml,
  patchConfigMapYaml,
  updateConfigMapYaml,
} from '../utils/devportal-config';
import { restartDevPortal } from '../utils/shell';

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

// A pending subscription approval row for our product (Pending status).
const pendingRowFor = (page: Page, productName: string) =>
  page
    .getByTestId('approval-table')
    .getByRole('row')
    .filter({ hasText: productName })
    .filter({ hasText: 'Pending' })
    .first();

test.describe('Approvals (platform admin)', () => {
  test.setTimeout(120_000);

  const adminAuth = createAuth('approvals-admin');
  const devAuth = createAuth('approvals-dev');
  const adminStoragePath = path.resolve(
    process.cwd(),
    `apps/site-e2e/test-results/.auth/${adminAuth.name}.json`,
  );
  const devStoragePath = path.resolve(
    process.cwd(),
    `apps/site-e2e/test-results/.auth/${devAuth.name}.json`,
  );

  const gatewayGroupId = 'default';
  const seed = `${Date.now()}`;
  const productName = `Approval Product ${seed}`;
  // More than one page (page size is 10) so pagination is actually exercised.
  const PENDING_COUNT = 12;

  let defaultConfig: string | null = null;
  let serviceId = '';
  let routeId = '';
  let productId = '';
  let devOrgName = '';

  test.beforeAll(async ({ a7Ctx }, testInfo) => {
    testInfo.setTimeout(600_000);
    fs.mkdirSync(path.dirname(adminStoragePath), { recursive: true });

    // 1) Platform admin: sign up, grant adminUserIds, restart, save storage state.
    defaultConfig = await getConfigMapYaml();
    const adminCtx = await genCtx();
    await login(adminCtx, adminAuth);
    const adminSession = await (await getSession(adminCtx)).json();
    await patchConfigMapYaml<ConfigMapData>((configObj) => {
      configObj.auth.adminUserIds = Array.from(
        new Set([...(configObj.auth.adminUserIds || []), adminSession.user.id]),
      );
    });
    await restartDevPortal();
    const adminCtxAfter = await genCtx();
    await login(adminCtxAfter, adminAuth);
    await adminCtxAfter.storageState({ path: adminStoragePath });
    await adminCtxAfter.dispose();
    await adminCtx.dispose();

    // 2) Developer: sign up + organization, save storage state.
    const devCtx = await genCtx();
    await login(devCtx, devAuth);
    const devOrg = await createOrganization(devCtx, devAuth.organization);
    devOrgName = devOrg.name ?? devAuth.organization;
    await devCtx.storageState({ path: devStoragePath });

    // 3) Control plane (fixture a7Ctx is authed + license-activated): gateway
    //    service + route + OAS + a manual-approval product.
    const svc = await a7PostPublishedService(a7Ctx, gatewayGroupId, {
      name: `approval-svc-${seed}`,
      upstream: {
        name: 'default',
        scheme: 'http',
        type: 'roundrobin',
        nodes: [{ host: '127.0.0.1', port: 1234, weight: 100 }],
      },
    });
    serviceId = svc.value.id;
    const route = await a7PostPublishedRoute(a7Ctx, gatewayGroupId, {
      name: `approval-route-${seed}`,
      service_id: serviceId,
      paths: ['/get'],
    });
    routeId = route.value.id;
    await a7PutServiceOAS(a7Ctx, gatewayGroupId, serviceId, httpbinRawOAS);
    const product = await a7PostGatewayProduct(a7Ctx, {
      name: productName,
      subscription_auto_approval: false,
      can_view_unsubscribed: true,
      linked_gateway_services: [
        { gateway_group_id: gatewayGroupId, service_id: serviceId },
      ],
      auth: { 'key-auth': {} },
    });
    productId = product.value.id;

    // 4) Developer creates N applications and subscribes them all to the product,
    //    producing N pending subscription approvals.
    const appIds: string[] = [];
    for (let i = 0; i < PENDING_COUNT; i++) {
      const app = await createApplication(devCtx, {
        name: `approval-app-${seed}-${i}`,
      }, devOrg.slug);
      appIds.push(app.id);
    }
    const subRes = await devCtx.post(`${API_PREFIX}/${devOrg.slug}/subscriptions`, {
      data: { api_products: [productId], applications: appIds },
      failOnStatusCode: false,
    });
    expect(subRes.status(), await subRes.text()).toBeLessThan(300);
    await devCtx.dispose();
  });

  test.afterAll(async ({ a7Ctx }) => {
    await a7DeleteProductList(a7Ctx, [productId]).catch(() => {});
    await a7DeletePublishedRoute(a7Ctx, routeId, gatewayGroupId).catch(
      () => {},
    );
    await a7DeleteService(a7Ctx, serviceId, gatewayGroupId).catch(() => {});
    if (defaultConfig) {
      await updateConfigMapYaml(defaultConfig);
      await restartDevPortal();
    }
  });

  test('non-admin developer cannot access the approvals page', async ({
    browser,
  }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      devStoragePath,
      testInfo,
    );
    try {
      await page.goto(PATH_APPROVALS);
      // The whole /admin section is platform-admin only -> redirected away.
      await expect(page).not.toHaveURL(/\/admin\/approvals(?:\?.*)?$/);
      await expect(page.getByTestId('approval-table')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('admin sees the pending approval with applicant org name and resource', async ({
    browser,
  }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStoragePath,
      testInfo,
    );
    try {
      await page.goto(PATH_APPROVALS);
      const table = page.getByTestId('approval-table');
      await expect(table).toBeVisible();

      const row = table
        .getByRole('row')
        .filter({ hasText: productName })
        .first();
      await expect(row).toBeVisible();
      await expect(row.getByText('API Product Subscription')).toBeVisible();
      // Applicant column shows the human-readable organization name.
      await expect(row.getByText(devOrgName)).toBeVisible();
      await expect(row.getByText('Pending')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('pagination limits a page to the page size and advances', async ({
    browser,
  }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStoragePath,
      testInfo,
    );
    try {
      await page.goto(PATH_APPROVALS);
      const table = page.getByTestId('approval-table');
      await expect(table).toBeVisible();

      // Regression guard: the page must show exactly one page worth of rows
      // (page size 10), not the whole list. The bug was page_size never being
      // sent, so every page rendered all rows.
      const dataRows = table.locator('tbody tr');
      await expect(dataRows).toHaveCount(10);

      const firstPageText = await page.getByTestId('result-text').innerText();
      await page.getByLabel('Next page').click();
      await expect(page.getByTestId('result-text')).not.toHaveText(
        firstPageText,
      );
      // Page 2 still cannot exceed the page size.
      expect(await dataRows.count()).toBeLessThanOrEqual(10);
      await expect(dataRows.first()).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('admin can approve a pending request; operator resolves to the admin', async ({
    browser,
  }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStoragePath,
      testInfo,
    );
    try {
      await page.goto(PATH_APPROVALS);
      const row = pendingRowFor(page, productName);
      await expect(row).toBeVisible();

      await row.getByRole('button', { name: 'Accept' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Confirm' }).click();

      await expect(page.getByText('Request approved')).toBeVisible();

      // After reload, an approved row exists and the operator marker has been
      // resolved to the acting admin's name (read from the approval metadata).
      await page.reload();
      const acceptedRow = page
        .getByTestId('approval-table')
        .getByRole('row')
        .filter({ hasText: productName })
        .filter({ hasText: 'Accepted' })
        .first();
      await expect(acceptedRow).toBeVisible();
      await expect(acceptedRow.getByText(adminAuth.name)).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('admin can reject a pending request', async ({ browser }, testInfo) => {
    const { context, page } = await createPageWithStorageState(
      browser,
      adminStoragePath,
      testInfo,
    );
    try {
      await page.goto(PATH_APPROVALS);
      const row = pendingRowFor(page, productName);
      await expect(row).toBeVisible();

      await row.getByRole('button', { name: 'More options' }).click();
      await page.getByRole('menuitem', { name: 'Reject' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Confirm' }).click();

      await expect(page.getByText('Request rejected')).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
