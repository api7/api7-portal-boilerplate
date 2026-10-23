import {
  Outlet,
  createFileRoute,
  redirect,
  useLoaderData,
} from '@tanstack/react-router';

import AdminSidebar from '@/components/admin/AdminSidebar';
import Header from '@/components/layouts/Header';
import TopBar from '@/components/layouts/TopBar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { PATH_LOGIN, PATH_ROOT } from '@/constants/path-prefix';
import { fetchSession } from '@/lib/query/session';

// Platform-admin-only layout: not an org context, so it doesn't reuse $slug's beforeLoad.
export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location, context }) => {
    const { session } = await fetchSession(context.queryClient);

    if (!session) {
      throw redirect({
        href: `${PATH_LOGIN}?redirectTo=${encodeURIComponent(location.href)}`,
      });
    }

    if (!session.canAccessAdmin) {
      throw redirect({ href: PATH_ROOT });
    }

    return { session };
  },
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex, nofollow' }],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { showApiHub } = useLoaderData({ from: '__root__' });

  return (
    <>
      <TopBar>
        <Header authorized canAccessAdmin showApiHub={showApiHub} />
      </TopBar>
      <div data-admin-layout="true">
        <SidebarProvider className="min-h-[calc(100svh-var(--app-header-height))]">
          <AdminSidebar />
          <SidebarInset>
            <div className="p-6 bg-background">
              <Outlet />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </>
  );
}
