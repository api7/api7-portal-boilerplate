import { verifySession, getOrganizations } from '@/lib/dal/util';
import { PATH_API_HUB } from '@/constants/path-prefix';
import { redirect } from 'next/navigation';
import ApiHubPage from '@/components/api-hub/pages/ApiHubPage';

export default async function ApiHubRootPage() {
  // Logged-in users with orgs: redirect to org-scoped API Hub.
  const session = await verifySession({ redirect: false });
  if (session?.user) {
    const orgs = await getOrganizations();
    if (orgs.length > 0) {
      redirect(`/${orgs[0].slug}${PATH_API_HUB}`);
    }
  }

  return <ApiHubPage />;
}
