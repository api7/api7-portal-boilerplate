import { verifySessionAndOrganization } from '@/lib/dal';
import MainLayout from '@/components/layouts/MainLayout';

export const dynamic = 'force-dynamic';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySessionAndOrganization();

  return <MainLayout>{children}</MainLayout>;
}
