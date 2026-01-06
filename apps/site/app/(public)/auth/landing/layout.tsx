import MainLayout from '@/components/layouts/MainLayout';

export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
