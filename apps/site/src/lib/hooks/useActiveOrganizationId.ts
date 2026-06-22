'use client';

import {
  type OrganizationAuthClient,
  useListOrganizations,
  useSession,
} from '@better-auth-ui/react';

import { authClient } from '@/lib/auth/client';

import { useOrganizationSlug } from './useOrganizationSlug';

/**
 * Derive the active organization from the URL slug.
 *
 * Combines:
 * - URL-based slug extraction (via {@link useOrganizationSlug})
 * - Organization list from the SSR-hydrated better-auth-ui cache
 *
 * Returns:
 * - `activeOrgId` / `activeOrg`: the org matching the current URL slug
 * - On global pages (no slug in URL), both are `undefined`
 * - `isLoading`: org list is still being fetched
 */
export const useActiveOrganizationId = () => {
  const slug = useOrganizationSlug();
  const { data: session } = useSession(authClient);

  const { data: orgs, isPending: isLoading } = useListOrganizations(
    authClient as OrganizationAuthClient,
    { enabled: !!session?.user },
  );

  const activeOrg = slug ? orgs?.find((org) => org.slug === slug) : undefined;

  return {
    activeOrgId: activeOrg?.id,
    activeOrg,
    slug,
    orgs,
    isLoading,
  } as const;
};
