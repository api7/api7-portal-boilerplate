import { expect, test } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';
import { PATH_AUTH } from '@site/constants/path-prefix';

import { createOrganization, genCtx, login } from '../req/common';

const ORG_CREATE_INVITATION = `${AUTH_BASE_PATH}/organization/invite-member`;
const ORG_LIST = `${AUTH_BASE_PATH}/organization/list`;

const createAuth = (prefix: string) => {
  const id = `${prefix}-${Date.now()}`;
  return {
    email: `${id}@test.example.com`,
    password: `Password3412.${id}`,
    name: id,
    organization: `${id}-org`,
  };
};

test('direct accept-invitation link works for a user who already belongs to another org', async ({
  browser,
}, testInfo) => {
  const ownerAuth = createAuth('inv-owner');
  const inviteeAuth = createAuth('inv-invitee');

  const ownerCtx = await genCtx();
  await login(ownerCtx, ownerAuth);
  const ownerOrg = await createOrganization(ownerCtx, `${ownerAuth.organization}-owner`);

  const inviteeCtx = await genCtx();
  await login(inviteeCtx, inviteeAuth);
  // The invitee already belongs to their own org before receiving the invite,
  // so the landing page's redirect-away-if-you-have-an-org behavior can't be
  // what makes this link work.
  await createOrganization(inviteeCtx, `${inviteeAuth.organization}-invitee`);

  const inviteRes = await ownerCtx.post(ORG_CREATE_INVITATION, {
    data: { email: inviteeAuth.email, role: 'member', organizationId: ownerOrg.id },
    failOnStatusCode: false,
  });
  expect(inviteRes.status()).toBe(200);
  const invitation = await inviteRes.json();

  const inviteeStoragePath = testInfo.outputPath('invitee-storage.json');
  await inviteeCtx.storageState({ path: inviteeStoragePath });
  await inviteeCtx.dispose();

  const context = await browser.newContext({ storageState: inviteeStoragePath });
  const page = await context.newPage();

  await page.goto(`${PATH_AUTH}/accept-invitation?invitationId=${invitation.id}`);

  await expect(page.locator('body')).not.toContainText('AuthProvider is required');
  // AcceptInvitation's title isn't a semantic heading element, so match on text.
  await expect(page.getByText('Organization invitation')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();

  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page).not.toHaveURL(/accept-invitation/);

  const finalCtx = await genCtx({ storageState: inviteeStoragePath });
  const orgsRes = await finalCtx.get(ORG_LIST, { failOnStatusCode: false });
  const orgs = (await orgsRes.json()) as Array<{ id: string }>;
  expect(orgs.some((org) => org.id === ownerOrg.id)).toBe(true);

  await context.close();
  await ownerCtx.dispose();
  await finalCtx.dispose();
});
