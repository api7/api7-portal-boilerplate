import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import NoAccessToast from '@/components/layouts/NoAccessToast';

const homeSearchSchema = z.object({
  error: z.string().optional(),
  slug: z.string().optional(),
});

export const Route = createFileRoute('/_public/')({
  validateSearch: homeSearchSchema,
  head: () => ({
    meta: [
      { title: 'Home' },
      {
        name: 'description',
        content:
          'Welcome to the Developer Portal. Discover APIs, manage applications, and access comprehensive documentation.',
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { error, slug } = Route.useSearch();
  const hasNoAccessError = error === 'no-access';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-4 text-4xl font-bold">Welcome to Developer Portal</h1>
      {hasNoAccessError && <NoAccessToast slug={slug} />}
      <p className="text-lg text-gray-600">
        Get started by exploring our APIs.
      </p>
    </main>
  );
}
