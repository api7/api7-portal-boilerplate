import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';

import { orgScopedMiddleware } from '../auth/middleware';
import { auth } from '../auth/server';

const orgSlugSchema = z.object({ organizationSlug: z.string().min(1) });

const listOrganizationMembersSchema = orgSlugSchema.extend({
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  filterField: z.string().optional(),
  filterOperator: z
    .enum([
      'in',
      'contains',
      'starts_with',
      'ends_with',
      'eq',
      'ne',
      'gt',
      'gte',
      'lt',
      'lte',
      'not_in',
    ])
    .optional(),
  filterValue: z.union([z.string(), z.number()]).optional(),
});

export const listOrganizationMembers = createServerFn({ method: 'GET' })
  .middleware([orgScopedMiddleware])
  .validator(listOrganizationMembersSchema)
  .handler(async ({ data: { organizationSlug: _, ...query }, context }) => {
    return auth.api.listMembers({
      headers: getRequest().headers,
      query: { organizationId: context.organizationId, ...query },
    });
  });

// Drives which per-row action buttons render — checked once here instead of
// through a client-side `useHasPermission` per button, which would otherwise
// leave the actions column blank until each permission check round-trips.
// Covers both the members and invitations tables on the same page so they
// share a single round-trip.
export const getMemberActionPermissions = createServerFn({ method: 'GET' })
  .middleware([orgScopedMiddleware])
  .validator(orgSlugSchema)
  .handler(async ({ context }) => {
    const headers = getRequest().headers;
    const [canInvite, canUpdate, canDelete, canCancelInvitation, activeRole] =
      await Promise.all([
        auth.api.hasPermission({
          headers,
          body: {
            organizationId: context.organizationId,
            permissions: { member: ['create'] },
          },
        }),
        auth.api.hasPermission({
          headers,
          body: {
            organizationId: context.organizationId,
            permissions: { member: ['update'] },
          },
        }),
        auth.api.hasPermission({
          headers,
          body: {
            organizationId: context.organizationId,
            permissions: { member: ['delete'] },
          },
        }),
        auth.api.hasPermission({
          headers,
          body: {
            organizationId: context.organizationId,
            permissions: { invitation: ['cancel'] },
          },
        }),
        // Caller's own role, independent of the paginated/filtered member list.
        auth.api.getActiveMemberRole({
          headers,
          query: { organizationId: context.organizationId },
        }),
      ]);
    return {
      currentUserId: context.session.user.id,
      callerRole: activeRole.role,
      canInvite: canInvite.success,
      canUpdate: canUpdate.success,
      canDelete: canDelete.success,
      canCancelInvitation: canCancelInvitation.success,
    };
  });

export const listOrganizationInvitations = createServerFn({ method: 'GET' })
  .middleware([orgScopedMiddleware])
  .validator(orgSlugSchema)
  .handler(async ({ context }) => {
    return auth.api.listInvitations({
      headers: getRequest().headers,
      query: { organizationId: context.organizationId },
    });
  });
