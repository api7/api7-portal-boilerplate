import { createFileRoute, Outlet, redirect, useLoaderData } from '@tanstack/react-router';

import MainLayout from '@/components/layouts/MainLayout';
import { PATH_LOGIN } from '@/constants/path-prefix';
import { getSessionAndOrganizations } from '@/lib/dal/session';

// Requires a session but no organization.
export const Route = createFileRoute('/_sessionOnly')({
  beforeLoad: async ({ location }) => {
    const { session, orgs } = await getSessionAndOrganizations({
      data: { respectPublicAccess: false },
    });

    if (!session) {
      throw redirect({
        href: `${PATH_LOGIN}?redirectTo=${encodeURIComponent(location.href)}`,
      });
    }

    return { session, orgs: orgs ?? [] };
  },
  component: SessionOnlyLayout,
});

function SessionOnlyLayout() {
  const { session, orgs } = Route.useRouteContext();
  const { showApiHub } = useLoaderData({ from: '__root__' });

  return (
    <MainLayout
      authorized
      canAccessAdmin={session.canAccessAdmin}
      showApiHub={showApiHub}
      isImpersonating={session.isImpersonating}
      email={session.user.email}
      orgs={orgs.map((org) => ({ slug: org.slug, name: org.name }))}
    >
      <Outlet />
    </MainLayout>
  );
}
