import { Page, expect } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';
import { PATH_API_HUB, PATH_ROOT } from '@site/constants/path-prefix';

import { E2E_TARGET_URL } from '../constant';
import { test } from '../fixture';

const createOrganization = async (
  page: Page,
  orgName: string,
): Promise<string> => {
  const response = await page.request.post(
    `${AUTH_BASE_PATH}/organization/create`,
    {
      data: {
        name: orgName,
        slug: orgName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        keepCurrentActiveOrganization: false,
      },
      headers: { origin: E2E_TARGET_URL },
      failOnStatusCode: false,
    },
  );

  expect(response.status()).toBe(200);
  const body = await response.json();
  const slug = body.slug;
  expect(slug).toBeTruthy();
  return slug;
};

const getViewAsTrigger = (page: Page) => {
  return page.getByRole('button').filter({ hasText: /Public view|View as:/ });
};

const getDropdownItem = (page: Page, text: string) => {
  return page.getByRole('menuitem').filter({ hasText: text }).first();
};

test.describe('API Hub - View As Org Selector', () => {
  test.setTimeout(60_000);

  test('navigates from public view to org-scoped api-hub when selecting an org', async ({
    page,
  }) => {
    const testId = Date.now();
    const orgName = `ViewAsOrgA${testId}`;

    await page.goto(PATH_ROOT);
    const orgSlug = await createOrganization(page, orgName);

    await page.goto(PATH_API_HUB);
    await expect(page).toHaveURL(PATH_API_HUB);

    const trigger = getViewAsTrigger(page);
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    await trigger.click();

    const orgItem = getDropdownItem(page, orgName);
    await expect(orgItem).toBeVisible({ timeout: 10_000 });
    await orgItem.click();

    await expect(page).toHaveURL(new RegExp(`/${orgSlug}${PATH_API_HUB}(?:\\?.*)?$`));
  });

  test('navigates back to public view from org-scoped api-hub', async ({
    page,
  }) => {
    const testId = Date.now();
    const orgName = `ViewAsOrgB${testId}`;

    await page.goto(PATH_ROOT);
    const orgSlug = await createOrganization(page, orgName);

    await page.goto(`/${orgSlug}${PATH_API_HUB}`);
    await expect(page).toHaveURL(new RegExp(`/${orgSlug}${PATH_API_HUB}`));

    const trigger = getViewAsTrigger(page);
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    await trigger.click();

    const publicItem = getDropdownItem(page, 'Public view');
    await expect(publicItem).toBeVisible({ timeout: 10_000 });
    await publicItem.click();

    // URL should end with /api-hub (the NOT check below confirms no org slug)
    await expect(page).toHaveURL(new RegExp(`${PATH_API_HUB}(?:\\?.*)?$`));
    await expect(page).not.toHaveURL(new RegExp(`/${orgSlug}${PATH_API_HUB}`));
  });

  test('switches between two org-scoped api-hub views', async ({ page }) => {
    const testId = Date.now();
    const org1Name = `ViewAsOrgC${testId}`;
    const org2Name = `ViewAsOrgD${testId}`;

    await page.goto(PATH_ROOT);
    const org1Slug = await createOrganization(page, org1Name);
    const org2Slug = await createOrganization(page, org2Name);

    await page.goto(`/${org1Slug}${PATH_API_HUB}`);
    await expect(page).toHaveURL(new RegExp(`/${org1Slug}${PATH_API_HUB}`));

    const trigger = getViewAsTrigger(page);
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    await trigger.click();

    const org2Item = getDropdownItem(page, org2Name);
    await expect(org2Item).toBeVisible({ timeout: 10_000 });
    await org2Item.click();

    await expect(page).toHaveURL(new RegExp(`/${org2Slug}${PATH_API_HUB}(?:\\?.*)?$`));
    await expect(page).not.toHaveURL(new RegExp(`/${org1Slug}${PATH_API_HUB}`));
  });
});
