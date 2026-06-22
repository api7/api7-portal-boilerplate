import 'server-only';

import { ensureSession } from '@better-auth-ui/react/server';
import { headers as nextHeaders } from 'next/headers';

import { getQueryClient } from '@/lib/req';
import { isImpersonatingSession } from './admin';
import { isPlatformAdmin } from './admin.server';
import { auth } from './server';

type CurrentSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export class PlatformAdminRequiredError extends Error {
  constructor() {
    super('Forbidden. Platform admin access is required.');
    this.name = 'PlatformAdminRequiredError';
  }
}

const getCurrentSession = async (
  requestHeaders?: Headers,
): Promise<CurrentSession | null> => {
  const headers = requestHeaders ?? (await nextHeaders());
  return ensureSession(getQueryClient(), auth, { headers }).catch(() => null);
};

export const getCurrentPlatformAdminSession = async (
  requestHeaders?: Headers,
): Promise<NonNullable<CurrentSession> | null> => {
  const session = await getCurrentSession(requestHeaders);

  if (
    !session?.user ||
    isImpersonatingSession(session.session.impersonatedBy)
  ) {
    return null;
  }

  return isPlatformAdmin(session.user) ? session : null;
};

export const assertCurrentPlatformAdmin = async (
  requestHeaders?: Headers,
): Promise<void> => {
  if (!(await getCurrentPlatformAdminSession(requestHeaders))) {
    throw new PlatformAdminRequiredError();
  }
};
