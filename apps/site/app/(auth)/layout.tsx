import { verifySessionAndOrganization } from '@/lib/dal';

export const dynamic = 'force-dynamic';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySessionAndOrganization();

  return children;
}
