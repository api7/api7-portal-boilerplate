import path from 'path';
import { test } from '../fixture';
import { expect } from '@playwright/test';
import { PATH_LOGIN } from '@site/constants/path-prefix';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';

test.describe.configure({ mode: 'serial' });

test.describe('Owner re-sign-in role restoration', () => {
  /**
   * Bug: After owner re-signs-in (without logout), better-auth creates a session
   * with activeOrganizationId=null. The TanStack Query cache retains this stale
   * value, so useCanManageApplications returns false → buttons appear disabled.
   *
   * Fix: handleSessionChange in providers.tsx detects the missing org, sets it
   * via client API, and refetches TanStack cache BEFORE navigation.
   *
   */
  test('owner: buttons stay enabled after re-sign-in and clicking My Applications', async ({
    page,
    auth,
  }) => {
    test.setTimeout(60_000);

    // Given: verify the user is already signed in (via workerStorageState fixture)
    const session = await page.request.get(`${AUTH_BASE_PATH}/get-session`, {
      failOnStatusCode: false,
    });
    expect(session.status()).toBe(200);
    expect((await session.json())?.session?.activeOrganizationId).toBeTruthy();

    // Given: owner re-signs-in via UI form (without logging out first)
    await page.goto(PATH_LOGIN);
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Email' }).fill(auth.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(auth.password);
    await page.getByRole('button', { name: 'Login' }).click();

    // When: sign-in completes and lands on default page via router.push("/")
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), {
      timeout: 30_000,
    });

    // When: click "My Applications" in the header (client-side router.push)
    await page.getByRole('link', { name: 'My Applications' }).click();

    // Then: applications page loads with button enabled (owner role)
    await expect(
      page.getByRole('main').getByText('My Applications')
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('application-table')).toBeVisible();

    const addBtn = page.getByRole('button', { name: 'Add Application' });
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeEnabled();
  });

  test('owner: session activeOrganizationId restored after re-sign-in and clicking My Applications', async ({
    page,
    auth,
  }) => {
    test.setTimeout(60_000);

    // Given: record the active org before re-sign-in
    const sessionBefore = await page.request.get(
      `${AUTH_BASE_PATH}/get-session`,
      { failOnStatusCode: false }
    );
    expect(sessionBefore.status()).toBe(200);
    const orgIdBefore = (await sessionBefore.json())?.session
      ?.activeOrganizationId;
    expect(orgIdBefore).toBeTruthy();

    // When: re-sign-in via UI form
    await page.goto(PATH_LOGIN);
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Email' }).fill(auth.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(auth.password);
    await page.getByRole('button', { name: 'Login' }).click();

    await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), {
      timeout: 30_000,
    });

    // When: click "My Applications" (client-side navigation)
    await page.getByRole('link', { name: 'My Applications' }).click();

    await expect(
      page.getByRole('main').getByText('My Applications')
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('application-table')).toBeVisible();

    // Then: button is enabled
    const addBtn = page.getByRole('button', { name: 'Add Application' });
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeEnabled();

    // Then: session has the same activeOrganizationId as before
    const sessionAfter = await page.request.get(
      `${AUTH_BASE_PATH}/get-session`,
      { failOnStatusCode: false }
    );
    expect(sessionAfter.status()).toBe(200);
    const orgIdAfter = (await sessionAfter.json())?.session
      ?.activeOrganizationId;
    expect(orgIdAfter).toBeTruthy();
    expect(orgIdAfter).toBe(orgIdBefore);

    // Save the page's updated storage state back to the worker state file.
    // After re-signin, the page has new session cookies; subsequent tests'
    // `ctx` fixture (created from this file) must use the current session.
    const stateFile = path.resolve(
      test.info().project.outputDir,
      `.auth/worker${test.info().parallelIndex}.json`
    );
    await page.context().storageState({ path: stateFile });
  });
});
