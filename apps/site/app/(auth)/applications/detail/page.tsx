import { verifySessionAndOrganization } from '@/lib/dal';
import { PATH_ROOT } from '@/constants/path-prefix';
import { redirect } from 'next/navigation';

export default async function ApplicationDetailRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { id } = await searchParams;
  const { session, orgs } = await verifySessionAndOrganization();
  const activeOrgId = session?.session.activeOrganizationId || orgs?.[0]?.id;
  const activeOrg = orgs?.find((org) => org.id === activeOrgId);

  if (!activeOrg?.slug) {
    redirect(PATH_ROOT);
  }

  redirect(`/${activeOrg.slug}/applications/detail?id=${encodeURIComponent(id ?? '')}`);
}
