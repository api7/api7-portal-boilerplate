import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import AdminSidebar from '@/components/admin/AdminSidebar';
import Header from '@/components/layouts/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { PATH_ROOT } from '@/constants/path-prefix';
import { isImpersonatingSession } from '@/lib/auth/admin';
import { isPlatformAdmin } from '@/lib/auth/admin.server';
import { verifySession } from '@/lib/dal/util';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession({ redirect: true });

  if (
    !session?.user ||
    !isPlatformAdmin(session.user) ||
    isImpersonatingSession(session.session.impersonatedBy)
  ) {
    redirect(PATH_ROOT);
  }

  return (
    <>
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
    </>
  );
}
