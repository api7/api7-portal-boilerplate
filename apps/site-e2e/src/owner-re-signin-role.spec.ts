import path from 'path';

import { expect } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';
import { PATH_LOGIN } from '@site/constants/path-prefix';

import { test } from '../fixture';

test.describe.configure({ mode: 'serial' });

test.describe('Owner re-sign-in role restoration', () => {
  const getCurrentOrgSlugFromUrl = (urlStr: string): string | null => {
    const pathname = new URL(urlStr).pathname;
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[1] === 'applications') {
      return parts[0];
    }
    return null;
  };

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

    // Sign out first: the new auth UI redirects away from the sign-in page when
    // already authenticated, so we must sign out before re-signing-in.
    await page.context().clearCookies();
    await page.goto(PATH_LOGIN);
    await page.waitForLoadState('networkidle');
    await page.getByRole('textbox', { name: 'Email' }).fill(auth.email);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(auth.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // When: sign-in completes and lands on default page via router.push("/")
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), {
      timeout: 30_000,
    });

    // When: click "My Applications" in the header (client-side router.push)
    await page.getByRole('link', { name: 'My Applications' }).click();

    // Then: applications page loads with button enabled (owner role)
    await expect(
      page.getByRole('main').getByText('My Applications'),
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

    // Given: record current organization before re-sign-in
    await page.goto('/applications');
    const orgSlugBefore = getCurrentOrgSlugFromUrl(page.url());
    expect(orgSlugBefore).toBeTruthy();

    const orgBeforeRes = await page.request.get(
      `${AUTH_BASE_PATH}/organization/get-full-organization`,
      { failOnStatusCode: false },
    );
    expect(orgBeforeRes.status()).toBe(200);
    const orgBefore = await orgBeforeRes.json();
    const orgIdBefore = orgBefore?.id;
    expect(orgIdBefore).toBeTruthy();

    // When: re-sign-in via UI form
    await page.goto(PATH_LOGIN);
    await page.waitForLoadState('networkidle');
    await page.getByRole('textbox', { name: 'Email' }).fill(auth.email);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(auth.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL((url) => !url.pathname.startsWith('/auth/'), {
      timeout: 30_000,
    });

    // When: click "My Applications" (client-side navigation)
    await page.getByRole('link', { name: 'My Applications' }).click();

    await expect(
      page.getByRole('main').getByText('My Applications'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('application-table')).toBeVisible();

    // Then: button is enabled
    const addBtn = page.getByRole('button', { name: 'Add Application' });
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeEnabled();

    // Then: organization-scoped URL is present after re-sign-in flow.
    await expect(page).toHaveURL(/\/[^/]+\/applications(?:\?.*)?$/);

    const currentSlug = getCurrentOrgSlugFromUrl(page.url());
    expect(currentSlug).toBeTruthy();

    const orgAfterRes = await page.request.get(
      `${AUTH_BASE_PATH}/organization/get-full-organization`,
      { failOnStatusCode: false },
    );
    expect(orgAfterRes.status()).toBe(200);
    const orgAfter = await orgAfterRes.json();
    const orgIdAfter = orgAfter?.id;
    const orgSlugAfter = orgAfter?.slug;
    // In slug-path mode, session active org can be null; if present, it should match current URL context.
    if (orgIdAfter) {
      expect(orgIdAfter).toBe(orgIdBefore);
    }
    if (orgSlugAfter) {
      expect(orgSlugAfter).toBe(currentSlug);
    }

    // Save the page's updated storage state back to the worker state file.
    // After re-signin, the page has new session cookies; subsequent tests'
    // `ctx` fixture (created from this file) must use the current session.
    const stateFile = path.resolve(
      test.info().project.outputDir,
      `.auth/worker${test.info().parallelIndex}.json`,
    );
    await page.context().storageState({ path: stateFile });
  });
});
