import 'server-only';

import { cache } from 'react';

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

export const getDeveloperIdFromSession = cache(
  async (): Promise<string | null> => null,
);
