import { Page, expect } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';
import { PATH_APPLICATIONS, PATH_ROOT } from '@site/constants/path-prefix';

import { test } from '../fixture';
import { uiAddApplication } from '../utils/ui';

const getOrgSwitcherBtn = (page: Page) => {
  return page.getByTestId('org-switcher');
};

const getOrgMenuItem = (page: Page, orgName: string) => {
  return page.getByRole('menuitem').filter({ hasText: orgName }).first();
};

const createOrganization = async (
  page: Page,
  orgName: string,
): Promise<string> => {
  const response = await page.request.post(
    `${AUTH_BASE_PATH}/organization/create`,
    {
      data: {
        name: orgName,
        slug: orgName.toLowerCase(),
        keepCurrentActiveOrganization: false,
      },
      failOnStatusCode: false,
    },
  );

  expect(response.status()).toBe(200);
  const body = await response.json();
  const slug = body.slug;
  expect(slug).toBeTruthy();

  return slug;
};

const switchToOrganization = async (page: Page, orgName: string) => {
  await getOrgSwitcherBtn(page).click();
  const menuItem = getOrgMenuItem(page, orgName);
  await expect(menuItem).toBeVisible();
  await menuItem.click();
};

test.describe('Organization Switch table coverage', () => {
  test.setTimeout(60_000);

  test('applications should refresh when switching organizations', async ({
    page,
  }) => {
    const testId = Date.now();
    const org1Name = `OrgA${testId}`;
    const org2Name = `OrgB${testId}`;
    const app1Name = `App-Org1-${testId}`;
    const app2Name = `App-Org2-${testId}`;
    let org1Slug: string;
    let org2Slug: string;

    await test.step('Create first organization and add an application', async () => {
      await page.goto(PATH_ROOT);
      org1Slug = await createOrganization(page, org1Name);

      await page.goto(`/${org1Slug}${PATH_APPLICATIONS}`);
      await uiAddApplication(page, { name: app1Name, desc: 'App for Org 1' });
      await expect(page.getByRole('cell', { name: app1Name })).toBeVisible();
    });

    await test.step('Create second organization and add a different application', async () => {
      await page.goto(PATH_ROOT);
      org2Slug = await createOrganization(page, org2Name);

      await page.goto(`/${org2Slug}${PATH_APPLICATIONS}`);
      await uiAddApplication(page, { name: app2Name, desc: 'App for Org 2' });
      await expect(page.getByRole('cell', { name: app2Name })).toBeVisible();
      await expect(
        page.getByRole('cell', { name: app1Name }),
      ).not.toBeVisible();
    });

    await test.step('Switch back to first organization and verify applications refresh', async () => {
      await switchToOrganization(page, org1Name);
      await expect(page).toHaveURL(
        new RegExp(`/${org1Slug}${PATH_APPLICATIONS}(?:\\?.*)?$`),
      );

      await expect(page.getByRole('cell', { name: app1Name })).toBeVisible();
      await expect(
        page.getByRole('cell', { name: app2Name }),
      ).not.toBeVisible();
    });

    await test.step('Switch to second organization and verify again', async () => {
      await switchToOrganization(page, org2Name);
      await expect(page).toHaveURL(
        new RegExp(`/${org2Slug}${PATH_APPLICATIONS}(?:\\?.*)?$`),
      );

      await expect(page.getByRole('cell', { name: app2Name })).toBeVisible();
      await expect(
        page.getByRole('cell', { name: app1Name }),
      ).not.toBeVisible();
    });
  });

  test('query cache should be invalidated on organization switch', async ({
    page,
  }) => {
    const testId = Date.now();
    const org1Name = `CacheTestOrg1${testId}`;
    const org2Name = `CacheTestOrg2${testId}`;
    let org1Slug: string;

    await test.step('Setup: Create two organizations', async () => {
      await page.goto(PATH_ROOT);
      org1Slug = await createOrganization(page, org1Name);
      await createOrganization(page, org2Name);
    });

    await test.step('Navigate to applications page', async () => {
      await page.goto(PATH_APPLICATIONS);
      await expect(page.getByTestId('application-table')).toBeVisible();
    });

    await test.step('Switch org and verify API calls are made', async () => {
      await switchToOrganization(page, org1Name);
      await expect(page).toHaveURL(
        new RegExp(`/${org1Slug}${PATH_APPLICATIONS}(?:\\?.*)?$`),
      );
      await expect(page.getByTestId('application-table')).toBeVisible();
    });
  });
});
