import Header from '@/components/layouts/Header';
import Footer from '@/components/layouts/Footer';
import ImpersonationBanner from '@/components/layouts/ImpersonationBanner';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ImpersonationBanner />
      <Header />
      <main
        className="min-h-screen p-4"
        style={{ backgroundColor: 'oklch(0.976139 0 0)' }}
      >
        {children}
      </main>
      <Footer />
    </>
  );
}
