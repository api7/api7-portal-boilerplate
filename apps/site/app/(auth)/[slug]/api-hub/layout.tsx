import { notFound } from 'next/navigation';

import { getConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default function SlugApiHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { app } = getConfig();
  if (app.apiHub?.enabled === false) notFound();
  return <>{children}</>;
}
