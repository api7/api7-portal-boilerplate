import { Locator, expect } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';
import { PATH_DOCS, PATH_ROOT } from '@site/constants/path-prefix';

import { E2E_TARGET_URL } from '../constant';
import { test } from '../fixture';
import { getActiveOrganizationSlug } from '../req/common';

// Leaving the org scope used to bounce through /account/organizations, since
// the settings page saw an empty active org before it unmounted.
test.describe('Organization settings - leaving the org scope', () => {
  const cases = [
    {
      name: 'Docs',
      getLink: (navbar: Locator) =>
        navbar.getByRole('link', { name: 'Docs', exact: true }),
      href: PATH_DOCS,
      expected: /\/docs(?:[/?].*)?$/,
    },
    {
      name: 'home',
      getLink: (navbar: Locator) => navbar.getByRole('link').first(),
      href: PATH_ROOT,
      expected: /:\/\/[^/]+\/(?:\?.*)?$/,
    },
  ];

  for (const { name, getLink, href, expected } of cases) {
    test(`clicking ${name} in the header goes straight there`, async ({
      auth,
      ctx,
      page,
    }) => {
      const orgSlug = await getActiveOrganizationSlug(ctx);
      // A fresh sign-in has no session-level active org, so the URL slug is
      // the only source of it.
      const res = await page.request.post(
        `${AUTH_BASE_PATH}/organization/set-active`,
        {
          data: { organizationId: null },
          headers: { origin: E2E_TARGET_URL },
          failOnStatusCode: false,
        },
      );
      expect(res.status()).toBe(200);

      await page.goto(`/${orgSlug}/settings`);
      // The bounce needs the active-org query settled; the name input only
      // renders once it has.
      await expect(page.locator('input[name="name"]')).toHaveValue(
        auth.organization!,
      );

      const visited: string[] = [];
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) visited.push(frame.url());
      });

      const anchor = getLink(page.locator('#header-navbar'));
      await expect(anchor).toHaveAttribute('href', href);
      await anchor.click();

      await expect(page).toHaveURL(expected);
      // Give a stray redirect time to land before asserting it never did.
      // eslint-disable-next-line playwright/no-wait-for-timeout
      await page.waitForTimeout(2_000);
      await expect(page).toHaveURL(expected);
      expect(visited.some((u) => u.includes('/account/organizations'))).toBe(
        false,
      );
    });
  }
});
