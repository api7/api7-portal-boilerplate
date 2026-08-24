import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { MAX_PAGE_SIZE } from '@/constants/common';
import { orgScopedMiddleware } from '../auth/middleware';
import { getPortalForOrganization } from '../portal-sdk/server';

const listDCRProvidersSchema = z.object({
  organizationSlug: z.string().min(1),
  page: z.number().int().positive().optional(),
  page_size: z.number().int().positive().max(MAX_PAGE_SIZE).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
  order_by: z.enum(['created_at', 'updated_at']).optional(),
  search: z.string().optional(),
});

export const listDCRProviders = createServerFn({ method: 'GET' })
  .middleware([orgScopedMiddleware])
  .validator(listDCRProvidersSchema)
  .handler(async ({ data: { organizationSlug: _, ...query }, context }) => {
    return getPortalForOrganization(context.organizationId).dcrProvider.list(
      query,
    );
  });
