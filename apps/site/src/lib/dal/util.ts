import 'server-only';

import { PATH_LANDING, PATH_LOGIN } from '@/constants/path-prefix';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { auth } from '../auth/server';
import { portal } from '../portal-sdk/server';

/**
 * Check if public access is enabled
 * @param respectPublicAccess - If false, skip API call and return false. Default: true
 * @returns true if public access is enabled, false otherwise
 */
export const isPublicAccessEnabled = cache(
  async (respectPublicAccess: boolean = true): Promise<boolean> => {
    if (!respectPublicAccess) {
      return false;
    }

    return portal.systemSetting.getPublicAccess();
  },
);

/**
 * Get current session
 * @param options.redirect - If true, redirect to login page when not logged in. Default: true
 * @returns Session if logged in, null if not logged in (when redirect=false)
 */
export const verifySession = cache(
  async (options: { redirect?: boolean } = { redirect: true }) => {
    const session = await auth.api
      .getSession({
        headers: await headers(),
      })
      .catch(() => null);

    if (!session && options.redirect) {
      redirect(PATH_LOGIN);
    }

    return session;
  },
);

/**
 * Get user's organizations
 * @returns Array of organizations, empty array if none
 */
export const getOrganizations = cache(async () => {
  const orgs = await auth.api
    .listOrganizations({
      headers: await headers(),
    })
    .catch(() => []);

  return orgs || [];
});

/**
 * Verify user has at least one organization
 * Redirects to landing page if no organization found
 */
export const verifyOrganization = cache(async () => {
  const orgs = await getOrganizations();

  if (!orgs.length) {
    redirect(PATH_LANDING);
  }

  return orgs;
});

/**
 * Verify current user can access organization specified by slug.
 * Returns matched organization when accessible, otherwise null.
 */
export const verifyOrganizationAccessBySlug = cache(async (slug: string) => {
  const session = await verifySession({ redirect: false });
  if (!session?.user) {
    return null;
  }

  const orgs = await getOrganizations();
  return orgs.find((org) => org.slug === slug) ?? null;
});
