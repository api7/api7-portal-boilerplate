import { Settings } from '@/components/auth/settings/settings';
import { verifySession } from '@/lib/dal/util';

export const dynamicParams = false;

export function generateStaticParams() {
  return ['settings', 'security', 'organizations'].map((path) => ({ path }));
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  await verifySession({ redirect: true });
  return (
    <main className="container p-4 md:p-6">
      <Settings path={path} />
    </main>
  );
}
