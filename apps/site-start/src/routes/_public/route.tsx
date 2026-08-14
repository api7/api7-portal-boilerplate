import { createFileRoute, Outlet, redirect, useLoaderData } from '@tanstack/react-router';

import MainLayout from '@/components/layouts/MainLayout';
import {
  PATH_ACCOUNT_TWO_FACTOR,
  PATH_LANDING,
  PATH_LOGIN,
} from '@/constants/path-prefix';
import { getSessionAndOrganizations } from '@/lib/dal/session';

// Guest access when the portal's public_access setting is on; otherwise
// requires a session, and a session requires at least one organization.
export const Route = createFileRoute('/_public')({
  beforeLoad: async ({ location }) => {
    const { session, orgs, publicAccessEnabled, requiresTwoFactorEnrollment } =
      await getSessionAndOrganizations({
        data: { respectPublicAccess: true },
      });

    if (!session) {
      if (!publicAccessEnabled) {
        throw redirect({
          href: `${PATH_LOGIN}?redirectTo=${encodeURIComponent(location.href)}`,
        });
      }
      return { session: null, orgs: null };
    }

    // Runs for hard loads and client-side navigation alike — beforeLoad is
    // isomorphic, so this covers both without needing a raw-request-level
    // guess at whether the underlying call was a page load or a server
    // function RPC.
    if (requiresTwoFactorEnrollment) {
      throw redirect({
        href: `${PATH_ACCOUNT_TWO_FACTOR}?redirectTo=${encodeURIComponent(location.href)}`,
      });
    }

    if (!orgs?.length) {
      throw redirect({ href: PATH_LANDING });
    }

    return { session, orgs };
  },
  component: PublicLayout,
});

function PublicLayout() {
  const { session, orgs } = Route.useRouteContext();
  const { showApiHub } = useLoaderData({ from: '__root__' });

  return (
    <MainLayout
      authorized={!!session}
      canAccessAdmin={session?.canAccessAdmin ?? false}
      showApiHub={showApiHub}
      isImpersonating={session?.isImpersonating ?? false}
      email={session?.user.email}
      orgs={(orgs ?? []).map((org) => ({ slug: org.slug, name: org.name }))}
    >
      <Outlet />
    </MainLayout>
  );
}
