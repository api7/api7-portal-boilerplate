import {
  Outlet,
  createFileRoute,
  notFound,
  redirect,
  useLoaderData,
} from '@tanstack/react-router';

import MainLayout from '@/components/layouts/MainLayout';
import {
  PATH_ACCOUNT_TWO_FACTOR,
  PATH_LOGIN,
  PATH_ROOT,
} from '@/constants/path-prefix';
import { loadQuery } from '@/lib/query/load-query';
import { memberRoleQueryOptions } from '@/lib/query/member-role';
import { fetchSession, refetchSession } from '@/lib/query/session';

// Organization-scoped layout: 404s on paths with no matching child route,
// otherwise requires a session, mandatory 2FA enrollment (if configured),
// and membership in the org matched by `slug`.
export const Route = createFileRoute('/$slug')({
  beforeLoad: async ({ location, params, matches, routeId, context }) => {
    // No child route matched past this layout — a garbage first segment, or
    // a bare slug with nothing after it.
    const noChildMatched = matches[matches.length - 1]?.routeId === routeId;

    const { session, orgs, publicAccessEnabled, requiresTwoFactorEnrollment } =
      await fetchSession(context.queryClient);

    if (!session) {
      // Guests can browse publicly, so an unmatched path is a genuine 404;
      // otherwise everything — real org URL or not — funnels through login.
      if (noChildMatched && publicAccessEnabled) throw notFound();

      throw redirect({
        href: `${PATH_LOGIN}?redirectTo=${encodeURIComponent(location.href)}`,
      });
    }

    // An authenticated user hitting an unmatched path always gets a real
    // 404 — there's no guest-access ambiguity left to resolve for them.
    if (noChildMatched) throw notFound();

    if (requiresTwoFactorEnrollment) {
      throw redirect({
        href: `${PATH_ACCOUNT_TWO_FACTOR}?redirectTo=${encodeURIComponent(location.href)}`,
      });
    }

    // The cached list can predate a rename or a new membership, so confirm with a fresh read.
    let org = (orgs ?? []).find((o) => o.slug === params.slug);
    let currentOrgs = orgs ?? [];
    if (!org) {
      currentOrgs = (await refetchSession(context.queryClient)).orgs ?? [];
      org = currentOrgs.find((o) => o.slug === params.slug);
    }
    if (!org) {
      throw redirect({
        href: `${PATH_ROOT}?error=no-access&slug=${encodeURIComponent(params.slug)}`,
      });
    }

    return { session, orgs: currentOrgs, org };
  },
  // The role only gates what the UI shows, so a failed prefetch is left to the hook.
  loader: async ({ params, context }) => {
    await Promise.allSettled([
      loadQuery(context.queryClient, memberRoleQueryOptions(params.slug)),
    ]);
  },
  component: OrgLayout,
});

function OrgLayout() {
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
