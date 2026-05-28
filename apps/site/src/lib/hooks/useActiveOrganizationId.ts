'use client';

import { authClient } from '@/lib/auth/client';
import { useQuery } from '@tanstack/react-query';

import { useOrganizationSlug } from './useOrganizationSlug';

/**
 * Derive the active organization from the URL slug.
 *
 * Combines:
 * - URL-based slug extraction (via {@link useOrganizationSlug})
 * - Organization list query
 *
 * Returns:
 * - `activeOrgId` / `activeOrg`: the org matching the current URL slug
 * - On global pages (no slug in URL), both are `undefined`
 * - `isLoading`: org list is still being fetched
 */
export const useActiveOrganizationId = () => {
  const slug = useOrganizationSlug();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const { data: orgs, isLoading } = useQuery({
    queryKey: ['organizations', userId],
    queryFn: async () => {
      const { data } = await authClient.organization.list();
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: userId !== undefined,
  });

  const activeOrg = slug ? orgs?.find((org) => org.slug === slug) : undefined;

  return {
    activeOrgId: activeOrg?.id,
    activeOrg,
    slug,
    orgs,
    isLoading,
  } as const;
};
