import { Settings } from '@/components/auth/settings/settings';

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
  return (
    <main className="container p-4 md:p-6">
      <Settings path={path} />
    </main>
  );
}
