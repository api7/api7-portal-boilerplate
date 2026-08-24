import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { MAX_PAGE_SIZE } from '@/constants/common';
import {
  orgScopedMiddleware,
  orgWriteRoleMiddleware,
} from '../auth/middleware';
import { getPortalForOrganization } from '../portal-sdk/server';

const orgSlugSchema = z.object({ organizationSlug: z.string().min(1) });

const listApplicationsSchema = orgSlugSchema.extend({
  api_product_id: z.string().min(1).optional(),
  search: z.string().optional(),
  labels: z.string().optional(),
  order_by: z.enum(['created_at', 'updated_at']).optional(),
  page: z.number().int().positive().optional(),
  page_size: z.number().int().positive().max(MAX_PAGE_SIZE).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

const applicationPayloadSchema = z.object({
  name: z.string().min(1).optional(),
  desc: z.string().optional(),
  labels: z.record(z.string(), z.string()).optional(),
});

const createApplicationSchema = orgSlugSchema.extend({
  ...applicationPayloadSchema.shape,
  name: z.string().min(1),
});

export const listApplications = createServerFn({ method: 'GET' })
  .middleware([orgScopedMiddleware])
  .validator(listApplicationsSchema)
  .handler(async ({ data: { organizationSlug: _, ...query }, context }) => {
    return getPortalForOrganization(context.organizationId).application.list(
      query,
    );
  });

export const getApplication = createServerFn({ method: 'GET' })
  .middleware([orgScopedMiddleware])
  .validator(orgSlugSchema.extend({ applicationId: z.string().min(1) }))
  .handler(async ({ data: { applicationId }, context }) => {
    return getPortalForOrganization(context.organizationId).application.get(
      applicationId,
    );
  });

export const getApplicationUsage = createServerFn({ method: 'GET' })
  .middleware([orgScopedMiddleware])
  .validator(
    orgSlugSchema.extend({
      application_id: z.array(z.string().min(1)).optional(),
      api_product_id: z.array(z.string().min(1)).optional(),
      credential_id: z.array(z.string().min(1)).optional(),
      start_at: z.number(),
      end_at: z.number(),
    }),
  )
  .handler(async ({ data: { organizationSlug: _, ...query }, context }) => {
    return getPortalForOrganization(context.organizationId).application.apiCall(
      query,
    );
  });

export const createApplication = createServerFn({ method: 'POST' })
  .middleware([orgWriteRoleMiddleware])
  .validator(createApplicationSchema)
  .handler(async ({ data: { organizationSlug: _, ...payload }, context }) => {
    return getPortalForOrganization(context.organizationId).application.create(
      payload,
    );
  });

export const updateApplication = createServerFn({ method: 'POST' })
  .middleware([orgWriteRoleMiddleware])
  .validator(
    orgSlugSchema.extend({
      applicationId: z.string().min(1),
      ...applicationPayloadSchema.shape,
    }),
  )
  .handler(
    async ({
      data: { organizationSlug: _, applicationId, ...payload },
      context,
    }) => {
      return getPortalForOrganization(
        context.organizationId,
      ).application.update(applicationId, payload);
    },
  );

export const deleteApplication = createServerFn({ method: 'POST' })
  .middleware([orgWriteRoleMiddleware])
  .validator(orgSlugSchema.extend({ applicationId: z.string().min(1) }))
  .handler(async ({ data: { applicationId }, context }) => {
    return getPortalForOrganization(context.organizationId).application.delete(
      applicationId,
    );
  });
