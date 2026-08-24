import { expect } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';

import { test } from '../fixture';
import {
  Ctx,
  getActiveOrganizationId,
  getActiveOrganizationSlug,
  inviteMemberViaUI,
} from '../req/common';
import { uiGetMoreOptionsButton, uiVerifyToast } from '../utils/ui';

type Invitation = { id: string; email: string; expiresAt: string };

// `get-invitation` only lets the invitee look up their own invitation, so the owner uses `list-invitations` instead.
const listInvitations = async (ctx: Ctx, organizationId: string) => {
  const res = await ctx.get(
    `${AUTH_BASE_PATH}/organization/list-invitations?organizationId=${organizationId}`,
    { failOnStatusCode: false },
  );
  expect(res.status()).toBe(200);
  return (await res.json()) as Invitation[];
};

test.describe('Organization Invitation Resend', () => {
  test("resend extends the pending invitation's expiry without creating a duplicate", async ({
    ctx,
    page,
  }) => {
    const email = `resend-${Date.now()}@test.example.com`;
    const orgSlug = await getActiveOrganizationSlug(ctx);
    await inviteMemberViaUI(page, orgSlug, email);
    // Drain this toast first — resend's success toast has identical copy.
    await uiVerifyToast(page, { hasText: 'Member invited successfully' });

    const orgId = await getActiveOrganizationId(ctx);
    const before = (await listInvitations(ctx, orgId)).find(
      (inv) => inv.email === email,
    );
    expect(before).toBeTruthy();

    const row = page.locator('tr', { hasText: email });
    await expect(row).toBeVisible();
    await uiGetMoreOptionsButton(row).click();
    await page.getByRole('menuitem', { name: 'Resend' }).click();
    await uiVerifyToast(page, { hasText: 'Member invited successfully' });

    const after = await listInvitations(ctx, orgId);
    const matching = after.filter((inv) => inv.email === email);
    expect(matching).toHaveLength(1);
    expect(matching[0].id).toBe(before!.id);
    expect(new Date(matching[0].expiresAt).getTime()).toBeGreaterThan(
      new Date(before!.expiresAt).getTime(),
    );
  });
});
