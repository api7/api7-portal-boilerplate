import { getSafeRedirectTo } from '@better-auth-ui/core';

import { TwoFactorSetup } from '@/components/auth/two-factor/two-factor-setup';
import { getConfig } from '@/lib/config';
import { verifySession } from '@/lib/dal/util';

export default async function TwoFactorSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  // `(session-only)/layout.tsx` already gates on session, but shared layouts
  // aren't guaranteed to re-run on every client-side navigation between
  // sibling routes (Next.js's router cache can reuse an already-rendered
  // layout segment) — assert directly here too rather than relying solely on
  // the parent. Deliberately not `verifySessionAndOrganization()`: this page
  // must stay reachable for a session with no organization yet, since
  // `twoFactor.required` is an instance-level gate, not a per-org one.
  await verifySession({ redirect: true });

  const { redirectTo: redirectParam } = await searchParams;
  const { app } = getConfig();
  const redirectTo = getSafeRedirectTo(redirectParam, app.baseURL!);

  return <TwoFactorSetup redirectTo={redirectTo} />;
}
