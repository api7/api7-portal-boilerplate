import Footer from '@/components/layouts/Footer';
import Header from '@/components/layouts/Header';
import ImpersonationBanner from '@/components/layouts/ImpersonationBanner';

// Fully public: reuse the standard site chrome (Header/Footer) WITHOUT the
// session/org gate that (public-controlled) applies. We compose the chrome here
// (instead of MainLayout) so the docs content area uses a white `bg-background`
// surface rather than MainLayout's gray `<main>`, while staying theme-aware
// (dark mode follows the token). force-dynamic matches the rest of the app
// (Header reads cookies).
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
      <main className="min-h-screen bg-background">{children}</main>
      <Footer />
    </>
  );
}
