import { ShieldAlert } from 'lucide-react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { RESERVED_FIRST_SEGMENTS } from '@/constants/common';
import { isImpersonatingSession } from '@/lib/auth/admin';
import { auth } from '@/lib/auth/server';
import { getOrganizations, verifySession } from '@/lib/dal/util';

const ImpersonationBanner = async () => {
  const session = await verifySession({ redirect: false });
  if (
    !session?.user ||
    !isImpersonatingSession(session.session.impersonatedBy)
  ) {
    return null;
  }

  const hdrs = await headers();
  const pathname = hdrs.get('x-pathname') ?? '';
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  const slug =
    firstSegment && !RESERVED_FIRST_SEGMENTS.has(firstSegment)
      ? firstSegment
      : null;

  let activeOrganizationName: string | null = null;
  if (slug) {
    const orgs = await getOrganizations();
    activeOrganizationName =
      orgs.find((org) => org.slug === slug)?.name ?? null;
  }

  async function stopImpersonating() {
    'use server';
    await auth.api.stopImpersonating({ headers: await headers() });
    redirect('/admin/organizations');
  }

  return (
    <div className="sticky top-0 z-60 border-b border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-3 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-amber-900 dark:text-amber-200">
            Currently in Impersonation Mode
            <span className="mx-1.5 text-amber-400 dark:text-amber-600">·</span>
            {activeOrganizationName && (
              <>
                <span className="font-medium">{activeOrganizationName}</span>
                <span className="mx-1.5 text-amber-400 dark:text-amber-600">
                  ·
                </span>
              </>
            )}
            <span className="text-amber-700 dark:text-amber-400">
              {session.user.email}
            </span>
          </span>
        </div>
        <form action={stopImpersonating}>
          <Button
            type="submit"
            variant="outline"
            size="xs"
            className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100 hover:text-amber-950 dark:border-amber-800 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-900/40 dark:hover:text-amber-200"
          >
            Exit Impersonation
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
