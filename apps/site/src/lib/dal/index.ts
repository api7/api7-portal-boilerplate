import 'server-only';

import { headers } from 'next/headers';
import { cache } from 'react';

import { auth } from '../auth/server';
import {
  isPublicAccessEnabled,
  verifyOrganization,
  verifySession,
} from './util';

/**
 * Verify user login and check organization.
 *
 * @param options.respectPublicAccess - If true, allow guest access when publicAccess=true. Default: false
 *
 * Active organization is now managed client-side via URL slug — the server no longer
 * calls setActiveOrganization. This function only validates session & org membership.
 */
export const verifySessionAndOrganization = cache(
  async (options: { respectPublicAccess?: boolean } = {}) => {
    const { respectPublicAccess = false } = options;

    const publicAccessEnabled =
      await isPublicAccessEnabled(respectPublicAccess);

    const session = await verifySession({ redirect: !publicAccessEnabled });

    if (!session) {
      // Not logged in and publicAccess = true, allow guest access
      return { session: null, orgs: null };
    }

    // User is logged in, check for organization
    const orgs = await verifyOrganization();

    return { session, orgs };
  },
);

/**
 * Get developer ID from the first accessible organization.
 *
 * This is a best-effort read — the primary org resolution path is via
 * URL-slug-prefixed API calls handled in the proxy route.
 *
 * @returns Developer ID (organization ID) if found, null otherwise
 */
export const getDeveloperIdFromSession = cache(
  async (): Promise<string | null> => {
    try {
      const reqHeaders = await headers();
      const organizations = await auth.api.listOrganizations({
        headers: reqHeaders,
      });

      if (!organizations || organizations.length === 0) {
        console.warn('No organizations found for user');
        return null;
      }

      return organizations[0].id;
    } catch {
      // Expected when user is not logged in or session is invalid.
      return null;
    }
  },
);
