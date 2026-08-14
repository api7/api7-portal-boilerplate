import { APIError as SDKAPIError } from '@api7/portal-sdk';
import { generateId } from '@better-auth/core/utils/id';
import { APIError } from 'better-auth';
import { customAlphabet } from 'nanoid';

import { portal } from '@/lib/portal-sdk/server';
import { ac, roles } from './permissions';

const genSlug = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

export const getOrganizationPluginOptions = (
  requireEmailVerificationOnInvitation: boolean,
) => ({
  ac,
  roles,
  requireEmailVerificationOnInvitation,
  organizationHooks: {
    beforeCreateOrganization: async ({
      organization,
    }: {
      organization: { slug?: string; [key: string]: unknown };
      user: { id: string; [key: string]: unknown };
    }) => {
      const slug =
        (organization.slug as string | undefined)?.trim() || genSlug();
      // Pre-generate org ID so developer can be created before the org is persisted.
      // Better Auth's adapter calls create() with forceAllowId:true, so this ID is used.
      // If developer creation fails here, the org is never written to DB — clean failure.
      const id = generateId(21);
      try {
        await portal.developer.create({ developer_id: id });
      } catch (error) {
        const message =
          SDKAPIError.isAPIError(error) && error.message
            ? error.message
            : 'Failed to initialize developer resources.';
        throw new APIError('INTERNAL_SERVER_ERROR', { message });
      }
      return { data: { ...organization, id, slug } };
    },

    beforeDeleteOrganization: async ({
      organization,
    }: {
      organization: { id: string; [key: string]: unknown };
      user: { id: string; [key: string]: unknown };
    }) => {
      try {
        await portal.developer.delete(organization.id);
      } catch (error) {
        if (SDKAPIError.isAPIError(error) && error.status === 404) {
          return;
        }
        const message =
          SDKAPIError.isAPIError(error) && error.message
            ? error.message
            : 'Failed to delete developer resources.';
        throw new APIError('INTERNAL_SERVER_ERROR', { message });
      }
    },
  },
});
