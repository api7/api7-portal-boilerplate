import type { ReactNode } from 'react';

import Footer from '@/components/layouts/Footer';
import Header from '@/components/layouts/Header';
import ImpersonationBanner from '@/components/layouts/ImpersonationBanner';

type MainLayoutProps = {
  children: ReactNode;
  authorized: boolean;
  canAccessAdmin: boolean;
  showApiHub: boolean;
  isImpersonating: boolean;
  email?: string;
  orgs: { slug: string; name: string }[];
};

const MainLayout = ({
  children,
  authorized,
  canAccessAdmin,
  showApiHub,
  isImpersonating,
  email,
  orgs,
}: MainLayoutProps) => {
  return (
    <>
      <Header
        authorized={authorized}
        canAccessAdmin={canAccessAdmin}
        showApiHub={showApiHub}
      />
      {isImpersonating && email && (
        <ImpersonationBanner email={email} orgs={orgs} />
      )}
      <main className="min-h-screen p-4 bg-background">{children}</main>
      <Footer />
    </>
  );
};

export default MainLayout;
