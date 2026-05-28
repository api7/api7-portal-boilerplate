'use client';

import { PATH_API_HUB } from '@/constants/path-prefix';

import { useActiveOrganizationId } from './useActiveOrganizationId';

/**
 * Returns the base path for the API Hub, always preferring an org-scoped path.
 *
 * - On an org-scoped page: `/{slug}/api-hub`
 * - On a global page but user has orgs: `/{firstOrgSlug}/api-hub`
 * - Otherwise: `/api-hub` (guest users or no orgs)
 */
export const useApiHubBasePath = () => {
  const { activeOrg, orgs } = useActiveOrganizationId();
  if (activeOrg?.slug) return `/${activeOrg.slug}${PATH_API_HUB}`;
  if (orgs && orgs.length > 0) return `/${orgs[0].slug}${PATH_API_HUB}`;
  return PATH_API_HUB;
};
