import { getSafeRedirectTo } from '@better-auth-ui/core';
import { createFileRoute, useLoaderData } from '@tanstack/react-router';

import { TwoFactorSetup } from '@/components/auth/two-factor/two-factor-setup';

export const Route = createFileRoute('/_sessionOnly/account/two-factor')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirectTo: typeof search.redirectTo === 'string' ? search.redirectTo : undefined,
  }),
  component: TwoFactorSetupPage,
});

function TwoFactorSetupPage() {
  const { redirectTo: redirectParam } = Route.useSearch();
  const { baseURL } = useLoaderData({ from: '__root__' });
  const redirectTo = getSafeRedirectTo(redirectParam, baseURL ?? '');

  return <TwoFactorSetup redirectTo={redirectTo} />;
}
