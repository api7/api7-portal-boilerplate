import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import AdminSidebar from '@/components/admin/AdminSidebar';
import Header from '@/components/layouts/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { PATH_ROOT } from '@/constants/path-prefix';
import { getCurrentPlatformAdminSession } from '@/lib/auth/platform-admin.server';
import { getQueryClient } from '@/lib/req';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await getCurrentPlatformAdminSession())) {
    redirect(PATH_ROOT);
  }

  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      <Header />
      <div data-admin-layout="true">
        <SidebarProvider>
          <AdminSidebar />
          <SidebarInset>
            <div className="p-6 bg-background">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </HydrationBoundary>
  );
}
