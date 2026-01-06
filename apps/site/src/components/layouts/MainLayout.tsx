import Header from '@/components/layouts/Header';
import Footer from '@/components/layouts/Footer';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
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
