import 'server-only';

import { headers } from 'next/headers';

import { isImpersonatingSession } from './admin';
import { isPlatformAdmin } from './admin.server';
import { auth } from './server';

/**
 * True when the current request is made by a platform-level admin and is not an
 * impersonation session. This is the same gate used for the Dashboard area and
 * is the authority for the approval feature.
 */
export const isCurrentUserPlatformAdmin = async (): Promise<boolean> => {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  return (
    !!session?.user &&
    isPlatformAdmin(session.user) &&
    !isImpersonatingSession(session.session.impersonatedBy)
  );
};
