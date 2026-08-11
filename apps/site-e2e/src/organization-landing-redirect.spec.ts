import { expect, test } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';
import { PATH_ACCOUNT_ORGANIZATIONS, PATH_LANDING } from '@site/constants/path-prefix';

import { createOrganization, genCtx, login } from '../req/common';
import { E2E_SITE_START_DB_NAME } from '../utils/devportal-config';
import { execSQL } from '../utils/shell';

const ORG_CREATE_INVITATION = `${AUTH_BASE_PATH}/organization/invite-member`;
const FE_E2E_DB =
  process.env.E2E_FE_TARGET === 'site-start'
    ? E2E_SITE_START_DB_NAME
    : 'devportal_fe_e2e';

const createAuth = (prefix: string) => {
  const id = `${prefix}-${Date.now()}`;
  return {
    email: `${id}@test.example.com`,
    password: `Password3412.${id}`,
    name: id,
    organization: `${id}-org`,
  };
};

test('landing page redirects existing members to account organizations, not away from pending invites', async ({
  browser,
}, testInfo) => {
  const ownerAuth = createAuth('landing-owner');
  const inviteeAuth = createAuth('landing-invitee');

  const ownerCtx = await genCtx();
  await login(ownerCtx, ownerAuth);
  const ownerOrg = await createOrganization(ownerCtx, `${ownerAuth.organization}-owner`);

  const inviteeCtx = await genCtx();
  await login(inviteeCtx, inviteeAuth);
  // Already belongs to an org before the invite — this is exactly the case
  // the old `router.replace(PATH_ROOT)` used to hide pending invites in.
  await createOrganization(inviteeCtx, `${inviteeAuth.organization}-invitee`);

  // better-auth's organization plugin unconditionally requires a verified
  // email to list invitations (unlike the single-invitation-by-id lookup
  // used by the direct accept-invitation link), independent of this app's
  // own requireEmailVerification setting. Neither app wires up a
  // sendVerificationEmail callback for this test environment, so there's no
  // email to click through — flip the flag directly.
  const escapedEmail = inviteeAuth.email.replace(/'/g, "''");
  await execSQL(
    FE_E2E_DB,
    `UPDATE users SET email_verified = true WHERE email = '${escapedEmail}';`,
  );
  // The existing session's cookie cache still carries the pre-update
  // emailVerified snapshot — re-sign-in to mint a fresh one off current data.
  await login(inviteeCtx, inviteeAuth);

  const inviteRes = await ownerCtx.post(ORG_CREATE_INVITATION, {
    data: { email: inviteeAuth.email, role: 'member', organizationId: ownerOrg.id },
    failOnStatusCode: false,
  });
  expect(inviteRes.status()).toBe(200);

  const inviteeStoragePath = testInfo.outputPath('invitee-storage.json');
  await inviteeCtx.storageState({ path: inviteeStoragePath });
  await inviteeCtx.dispose();

  const context = await browser.newContext({ storageState: inviteeStoragePath });
  const page = await context.newPage();

  await page.goto(PATH_LANDING);

  await expect(page).toHaveURL(new RegExp(PATH_ACCOUNT_ORGANIZATIONS.replace('/', '\\/')));
  await expect(page.getByText(`${ownerAuth.organization}-owner`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();

  await context.close();
  await ownerCtx.dispose();
});
