import { RootProvider } from 'fumadocs-ui/provider/next';

import DocsSearch from '@/components/docs/DocsSearch';
import Header from '@/components/layouts/Header';
import ImpersonationBanner from '@/components/layouts/ImpersonationBanner';

export const dynamic = 'force-dynamic';

export default function DocsPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ImpersonationBanner />
      <Header />
      <RootProvider
        theme={{ enabled: false }}
        search={{ SearchDialog: DocsSearch }}
      >
        {children}
      </RootProvider>
    </>
  );
}
