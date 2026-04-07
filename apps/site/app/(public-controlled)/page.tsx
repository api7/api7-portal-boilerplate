import { Metadata } from 'next';
import { generateSEO } from '@/lib/seo/metadata';
import { PATH_ROOT } from '@/constants/path-prefix';
import NoAccessToast from '@/components/layouts/NoAccessToast';

export const metadata: Metadata = generateSEO({
  title: 'Home',
  description:
    'Welcome to the Developer Portal. Discover APIs, manage applications, and access comprehensive documentation.',
  path: PATH_ROOT,
});

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const hasNoAccessError = params.error === 'no-access';
  const slug = params.slug;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Welcome to Developer Portal</h1>
      {hasNoAccessError && <NoAccessToast slug={slug} />}
      <p className="text-lg text-gray-600">Get started by editing app/page.tsx</p>
    </main>
  );
}
