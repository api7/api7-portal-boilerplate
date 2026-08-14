import { createFileRoute, Outlet, useLoaderData } from '@tanstack/react-router';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';

import DocsSearch from '@/components/docs/DocsSearch';
import Header from '@/components/layouts/Header';
import ImpersonationBanner from '@/components/layouts/ImpersonationBanner';
import { getSessionAndOrganizations } from '@/lib/dal/session';
import { getDocsTree } from '@/lib/docs/data';

// Always public — session is only fetched to drive Header/ImpersonationBanner,
// never gates access, unlike `_public`/`_sessionOnly`.
export const Route = createFileRoute('/docs')({
  beforeLoad: async () => {
    const { session, orgs } = await getSessionAndOrganizations({
      data: { respectPublicAccess: false },
    });
    return { session, orgs: orgs ?? [] };
  },
  loader: () => getDocsTree(),
  component: DocsPublicLayout,
});

function DocsPublicLayout() {
  const { session, orgs } = Route.useRouteContext();
  const { showApiHub } = useLoaderData({ from: '__root__' });
  // `useFumadocsLoader` always looks for a `pageTree` key on the loader
  // data, deserializing its heading/icon HTML strings back into JSX.
  const { pageTree } = useFumadocsLoader(Route.useLoaderData());

  return (
    <>
      {session?.isImpersonating && session.user.email && (
        <ImpersonationBanner
          email={session.user.email}
          orgs={orgs.map((org) => ({ slug: org.slug, name: org.name }))}
        />
      )}
      <Header
        authorized={!!session}
        canAccessAdmin={session?.canAccessAdmin ?? false}
        showApiHub={showApiHub}
      />
      <RootProvider theme={{ enabled: false }} search={{ SearchDialog: DocsSearch }}>
        <DocsLayout
          tree={pageTree}
          themeSwitch={{ enabled: false }}
          containerProps={{
            style: { '--fd-docs-row-1': 'var(--app-header-height)' } as React.CSSProperties,
          }}
        >
          <Outlet />
        </DocsLayout>
      </RootProvider>
    </>
  );
}
