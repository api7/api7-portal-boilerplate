import { APIError } from '@api7/portal-sdk';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { MAX_PAGE_SIZE } from '@/constants/common';
import { orgScopedMiddleware } from '../auth/middleware';
import { getPortalForOrganization, portal } from '../portal-sdk/server';

const listApiProductsSchema = z.object({
  // Optional because some callers (e.g. a subscribe-product picker) don't paginate.
  page: z.number().int().positive().optional(),
  page_size: z.number().int().positive().max(MAX_PAGE_SIZE).optional(),
  search: z.string().optional(),
  subscription_status: z
    .enum(['subscribed', 'wait_for_approval', 'unsubscribed'])
    .optional(),
  application_id: z.string().min(1).optional(),
});

export const listApiProducts = createServerFn({ method: 'GET' })
  .validator(listApiProductsSchema)
  .handler(async ({ data: query }) => {
    return portal.apiProduct.list(query).catch((error: unknown) => {
      console.error('Failed to list API products:', {
        message: error instanceof Error ? error.message : String(error),
        status: APIError.isAPIError(error) ? error.status : undefined,
      });
      return { list: [], total: 0 };
    });
  });

export const getApiProduct = createServerFn({ method: 'GET' })
  .validator(z.string().min(1))
  .handler(async ({ data: id }) => {
    try {
      return await portal.apiProduct.get(id);
    } catch (err) {
      if (APIError.isAPIError(err) && err.status === 404) {
        return null;
      }
      throw err;
    }
  });

export const listApiProductsForOrganization = createServerFn({ method: 'GET' })
  .middleware([orgScopedMiddleware])
  .validator(
    listApiProductsSchema.extend({ organizationSlug: z.string().min(1) }),
  )
  .handler(async ({ data: { organizationSlug: _, ...query }, context }) => {
    return getPortalForOrganization(context.organizationId).apiProduct.list(
      query,
    );
  });

export const getApiProductForOrganization = createServerFn({ method: 'GET' })
  .middleware([orgScopedMiddleware])
  .validator(
    z.object({ id: z.string().min(1), organizationSlug: z.string().min(1) }),
  )
  .handler(async ({ data: { id }, context }) => {
    try {
      return await getPortalForOrganization(
        context.organizationId,
      ).apiProduct.get(id);
    } catch (err) {
      if (APIError.isAPIError(err) && err.status === 404) {
        return null;
      }
      throw err;
    }
  });
