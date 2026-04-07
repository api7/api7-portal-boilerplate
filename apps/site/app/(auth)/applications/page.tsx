import { verifySessionAndOrganization } from '@/lib/dal';
import { PATH_ROOT } from '@/constants/path-prefix';
import { redirect } from 'next/navigation';

export default async function AuthApplicationsRedirectPage() {
  const { session, orgs } = await verifySessionAndOrganization();
  const activeOrgId = session?.session.activeOrganizationId || orgs?.[0]?.id;
  const activeOrg = orgs?.find((org) => org.id === activeOrgId);

  if (!activeOrg?.slug) {
    redirect(PATH_ROOT);
  }

  redirect(`/${activeOrg.slug}/applications`);
}
