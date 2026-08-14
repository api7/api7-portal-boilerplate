import { createFileRoute, Outlet, redirect, useLoaderData } from '@tanstack/react-router';

import AdminSidebar from '@/components/admin/AdminSidebar';
import Header from '@/components/layouts/Header';
import { SidebarInset, SidebarProvider } from '@api7/portal-ui/components/ui/sidebar';
import { PATH_ROOT } from '@/constants/path-prefix';
import { getSessionAndOrganizations } from '@/lib/dal/session';

// Platform-admin-only layout: not an org context, so it doesn't reuse $slug's beforeLoad.
export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const { session } = await getSessionAndOrganizations({
      data: { respectPublicAccess: false },
    });

    if (!session?.canAccessAdmin) {
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
      <Header authorized canAccessAdmin showApiHub={showApiHub} />
      <div data-admin-layout="true">
        <SidebarProvider>
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
