import { PATH_ROOT } from '@/constants/path-prefix';
import { verifySessionAndOrganization } from '@/lib/dal';
import { redirect } from 'next/navigation';

export default async function AuthApplicationsRedirectPage() {
  const { orgs } = await verifySessionAndOrganization();
  const activeOrg = orgs?.[0];

  if (!activeOrg?.slug) {
    redirect(PATH_ROOT);
  }

  redirect(`/${activeOrg.slug}/applications`);
}
