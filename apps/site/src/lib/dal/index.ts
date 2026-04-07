import 'server-only';
import { cache } from 'react';
import {
  isPublicAccessEnabled,
  verifySession,
  verifyOrganization,
} from './util';
import { auth } from '../auth/server';
import { headers } from 'next/headers';

/**
 * Verify user login and check organization
 *
 * @param options.respectPublicAccess - If true, allow guest access when publicAccess=true. Default: false
 *
 * Logic:
 * 1. If respectPublicAccess=true and publicAccess=true, allow guest access
 * 2. Otherwise require login
 * 3. If user is logged in, check for organization
 * 4. If logged in but no organization, redirect to /auth/landing
 */
export const verifySessionAndOrganization = cache(
  async (options: { respectPublicAccess?: boolean } = {}) => {
    const { respectPublicAccess = false } = options;

    const publicAccessEnabled = await isPublicAccessEnabled(
      respectPublicAccess
    );

    const session = await verifySession({ redirect: !publicAccessEnabled });

    if (!session) {
      // Not logged in and publicAccess = true, allow guest access
      return { session: null, orgs: null };
    }

    // User is logged in, check for organization
    const orgs = await verifyOrganization();

    // Ensure activeOrganizationId is set in the session.
    // After re-login (e.g. visiting /auth/sign-in while already logged in),
    // better-auth creates a fresh session without activeOrganizationId.
    // Without this, the client-side role query (enabled: !!activeOrgId)
    // stays disabled and all role-gated buttons appear disabled.
    if (!session.session.activeOrganizationId && orgs.length > 0) {
      try {
        // For multi-org users this may pick the wrong org because the
        // previous activeOrganizationId is already null in the new session.
        // The client-side fix (prevOrgIdRef in providers.tsx) is the
        // authoritative restore path; this is a best-effort SSR fallback.
        await auth.api.setActiveOrganization({
          body: { organizationId: orgs[0].id },
          headers: await headers(),
        });

        // Re-fetch session so SSR renders with the updated activeOrganizationId.
        // Without this, the stale session object (activeOrganizationId: null)
        // would be used for SSR, causing client hydration mismatch.
        const updatedSession = await auth.api.getSession({
          headers: await headers(),
        });
        if (updatedSession) {
          return { session: updatedSession, orgs };
        }
      } catch {
        // Best-effort recovery — fall through to return the original session
        // so the page still renders (client-side fix will handle org restoration)
      }
    }

    return { session, orgs };
  }
);

/**
 * Get developer ID from the active organization of current session
 * The organization ID is directly used as the developer ID (no mapping needed)
 * If no active organization is set, automatically sets the first one
 * @returns Developer ID (organization ID) if found, null otherwise
 */
export const getDeveloperIdFromSession = cache(
  async (): Promise<string | null> => {
    try {
      const sessionData = await auth.api.getSession({
        headers: await headers(),
      });

      let orgId = sessionData?.session?.activeOrganizationId;

      // If no active organization, get the first one and set it as active
      if (!orgId) {
        const organizations = await auth.api.listOrganizations({
          headers: await headers(),
        });

        if (!organizations || organizations.length === 0) {
          console.warn('No organizations found for user');
          return null;
        }

        orgId = organizations[0].id;

        // Set active organization using auth API
        await auth.api.setActiveOrganization({
          body: {
            organizationId: orgId,
          },
          headers: await headers(),
        });
      }

      // Organization ID is directly used as developer ID
      return orgId;
    } catch (error) {
      // This is expected when user is not logged in or session is invalid
      // No need to log as it creates noise in production logs
      return null;
    }
  }
);
