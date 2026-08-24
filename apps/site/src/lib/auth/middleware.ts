import { createMiddleware } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';

import { getConfig } from '../config';
import { isPlatformAdmin } from './admin.server';
import { isOwnerOrAdminRole } from './permissions';
import { auth } from './server';
import { type UserWithTwoFactor, isTwoFactorEnabled } from './two-factor';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Session + 2FA gate for org-scoped data access. Org membership itself is
// checked by the caller (route params aren't visible to request middleware).
export const authMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const { auth: authConfig } = getConfig();
    const needsFreshSession =
      WRITE_METHODS.has(request.method) || authConfig.twoFactor.required;
    const session = await auth.api.getSession({
      headers: request.headers,
      query: needsFreshSession ? { disableCookieCache: true } : undefined,
    });
    if (!session?.user) {
      return Response.json(
        { message: 'Unauthorized. Sign in is required.' },
        { status: 401 },
      );
    }
    if (
      authConfig.twoFactor.required &&
      !isTwoFactorEnabled(session.user as UserWithTwoFactor)
    ) {
      return Response.json(
        { message: 'Forbidden. Two-factor authentication is required.' },
        { status: 403 },
      );
    }
    return next({ context: { session } });
  },
);

// Resolves `organizationSlug` to a real org membership; the id is handed
// downstream via context, never trusted from the client directly.
export const orgScopedMiddleware = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  // .loose() — a strict schema here would replace `data` for the rest of the
  // chain and silently drop every other field (name, payload, ...).
  .validator(z.object({ organizationSlug: z.string().min(1) }).loose())
  .server(async ({ data, next }) => {
    const orgs = await auth.api.listOrganizations({
      headers: getRequest().headers,
    });
    const org = orgs.find((org) => org.slug === data.organizationSlug);
    if (!org) {
      throw new Error('Forbidden. You are not a member of this organization.');
    }
    return next({ context: { organizationId: org.id } });
  });

// Additionally requires owner/admin membership for write access.
export const orgWriteRoleMiddleware = createMiddleware({ type: 'function' })
  .middleware([orgScopedMiddleware])
  .server(async ({ context, next }) => {
    const activeMember = await auth.api.getActiveMemberRole({
      headers: getRequest().headers,
      query: { organizationId: context.organizationId },
    });
    if (!isOwnerOrAdminRole(activeMember?.role)) {
      throw new Error(
        'Forbidden. Member role is read-only for this resource in current organization.',
      );
    }
    return next();
  });

export const platformAdminMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
      query: { disableCookieCache: true },
    });
    if (
      !session?.user ||
      !!session.session.impersonatedBy ||
      !isPlatformAdmin(session.user)
    ) {
      throw new Error('Forbidden. Platform admin access is required.');
    }
    const { auth: authConfig } = getConfig();
    if (
      authConfig.twoFactor.required &&
      !isTwoFactorEnabled(session.user as UserWithTwoFactor)
    ) {
      throw new Error('Forbidden. Two-factor authentication is required.');
    }
    return next({ context: { session } });
  },
);
