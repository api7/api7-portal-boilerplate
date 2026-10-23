import { Outlet, createFileRoute, useLoaderData } from '@tanstack/react-router';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';

import DocsSearch from '@/components/docs/DocsSearch';
import Header from '@/components/layouts/Header';
import ImpersonationBanner from '@/components/layouts/ImpersonationBanner';
import TopBar from '@/components/layouts/TopBar';
import { source } from '@/lib/docs/source';
import { peekSession } from '@/lib/query/session';

const pageTree = source.getPageTree();

// Always public — session is only read to drive Header/ImpersonationBanner,
// never gates access, unlike `_public`/`_sessionOnly`.
export const Route = createFileRoute('/docs')({
  beforeLoad: async ({ context }) => {
    const { session, orgs } = await peekSession(context.queryClient);
    return { session, orgs: orgs ?? [] };
  },
  component: DocsPublicLayout,
});

function DocsPublicLayout() {
  const { session, orgs } = Route.useRouteContext();
  const { showApiHub } = useLoaderData({ from: '__root__' });

  return (
    <>
      <TopBar>
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
      </TopBar>
      <RootProvider
        theme={{ enabled: false }}
        search={{ SearchDialog: DocsSearch }}
      >
        <DocsLayout
          tree={pageTree}
          themeSwitch={{ enabled: false }}
          containerProps={{
            style: {
              '--fd-docs-row-1': 'var(--app-top-bar-height)',
            } as React.CSSProperties,
          }}
        >
          <Outlet />
        </DocsLayout>
      </RootProvider>
    </>
  );
}
