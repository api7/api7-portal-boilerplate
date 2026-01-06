import { PageNotFound } from "@/components/slices/NotFound";
import { verifySessionAndOrganization } from '@/lib/dal';

export const dynamic = 'force-dynamic';

export default async function NotFound() {
  await verifySessionAndOrganization({ respectPublicAccess: true });
  return <PageNotFound />;
}
