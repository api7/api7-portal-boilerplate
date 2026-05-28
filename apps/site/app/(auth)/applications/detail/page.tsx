import { PATH_ROOT } from '@/constants/path-prefix';
import { verifySessionAndOrganization } from '@/lib/dal';
import { redirect } from 'next/navigation';

export default async function ApplicationDetailRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { id } = await searchParams;
  const { orgs } = await verifySessionAndOrganization();
  const activeOrg = orgs?.[0];

  if (!activeOrg?.slug) {
    redirect(PATH_ROOT);
  }

  redirect(
    `/${activeOrg.slug}/applications/detail?id=${encodeURIComponent(id ?? '')}`,
  );
}
