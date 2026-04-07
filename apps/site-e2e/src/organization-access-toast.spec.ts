import { expect } from '@playwright/test';
import { test } from '../fixture';
import { PATH_APPLICATIONS, PATH_ROOT } from '@site/constants/path-prefix';
import { uiVerifyToast } from '../utils/ui';

test.describe('Organization Access Error', () => {
  test('should show top-right toast instead of inline page alert when organization is inaccessible', async ({
    page,
  }) => {
    const unknownOrgSlug = `no-access-${Date.now()}`;
    await page.goto(`/${unknownOrgSlug}${PATH_APPLICATIONS}`);

    // Redirect target is home page. Query params may be removed quickly by client-side cleanup.
    await expect(page).toHaveURL(new RegExp(`^.*${PATH_ROOT}(\\?.*)?$`));

    await uiVerifyToast(page, {
      hasText: `You don't have permission to access organization "${unknownOrgSlug}".`,
    });

    // Permission error should not be rendered as inline page content.
    await expect(page.locator('main .ant-alert')).toHaveCount(0);
  });
});
