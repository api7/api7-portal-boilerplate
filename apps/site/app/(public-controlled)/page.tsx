import { Metadata } from 'next';
import { generateSEO } from '@/lib/seo/metadata';
import { PATH_ROOT } from '@/constants/path-prefix';

export const metadata: Metadata = generateSEO({
  title: 'Home',
  description:
    'Welcome to the Developer Portal. Discover APIs, manage applications, and access comprehensive documentation.',
  path: PATH_ROOT,
});

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Welcome to Developer Portal</h1>
      <p className="text-lg text-gray-600">Get started by editing app/page.tsx</p>
    </main>
  );
}
