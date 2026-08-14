import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { MAX_PAGE_SIZE } from '@/constants/common';
import {
  orgScopedMiddleware,
  orgWriteRoleMiddleware,
} from '../auth/middleware';
import { getPortalForOrganization } from '../portal-sdk/server';

const orgSlugSchema = z.object({ organizationSlug: z.string().min(1) });

const listSubscriptionsSchema = orgSlugSchema.extend({
  api_product_id: z.string().min(1).optional(),
  application_id: z.string().min(1).optional(),
  status: z
    .array(z.enum(['unsubscribed', 'wait_for_approval', 'subscribed']))
    .optional(),
  search: z.string().optional(),
  order_by: z.enum(['developer_name', 'subscribed_at']).optional(),
  // Coerced because useSubscriptionList sends page/page_size as numeric strings.
  page: z.coerce.number().int().positive().optional(),
  page_size: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

const bulkSubscribeSchema = orgSlugSchema.extend({
  applications: z.array(z.string().min(1)),
  api_products: z.array(z.string().min(1)),
});

export const listSubscriptions = createServerFn({ method: 'GET' })
  .middleware([orgScopedMiddleware])
  .validator(listSubscriptionsSchema)
  .handler(async ({ data: { organizationSlug: _, ...query }, context }) => {
    return getPortalForOrganization(context.organizationId).subscription.list(
      query,
    );
  });

export const bulkSubscribe = createServerFn({ method: 'POST' })
  .middleware([orgWriteRoleMiddleware])
  .validator(bulkSubscribeSchema)
  .handler(async ({ data: { organizationSlug: _, ...payload }, context }) => {
    return getPortalForOrganization(
      context.organizationId,
    ).subscription.bulkSubscribe(payload);
  });

export const unsubscribe = createServerFn({ method: 'POST' })
  .middleware([orgWriteRoleMiddleware])
  .validator(orgSlugSchema.extend({ subscriptionId: z.string().min(1) }))
  .handler(async ({ data: { subscriptionId }, context }) => {
    return getPortalForOrganization(
      context.organizationId,
    ).subscription.unsubscribe(subscriptionId);
  });
