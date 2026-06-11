'use client';

import { ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { isImpersonatingSession } from '@/lib/auth/admin';
import { authClient } from '@/lib/auth/client';
import { useActiveOrganizationId } from '@/lib/hooks/useActiveOrganizationId';
import { useQueryClient } from '@tanstack/react-query';

const ImpersonationBanner = () => {
  const queryClient = useQueryClient();
  const sessionReq = authClient.useSession();
  const [stopping, setStopping] = useState(false);

  const impersonatedBy = sessionReq.data?.session?.impersonatedBy;
  const isImpersonating = isImpersonatingSession(impersonatedBy);

  const { activeOrg } = useActiveOrganizationId();

  const activeOrganizationName = useMemo(() => {
    return activeOrg?.name ?? null;
  }, [activeOrg]);

  if (!isImpersonating || !sessionReq.data?.user) {
    return null;
  }

  const handleStopImpersonating = async () => {
    setStopping(true);
    try {
      await authClient.admin.stopImpersonating();
      await queryClient.refetchQueries({ queryKey: ['session'] });
      window.location.assign('/admin/organizations');
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="sticky top-0 z-[60] border-b border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-3 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-amber-900 dark:text-amber-200">
            Currently in Impersonation Mode
            <span className="mx-1.5 text-amber-400 dark:text-amber-600">·</span>
            {activeOrganizationName && (
              <>
                <span className="font-medium">{activeOrganizationName}</span>
                <span className="mx-1.5 text-amber-400 dark:text-amber-600">·</span>
              </>
            )}
            <span className="text-amber-700 dark:text-amber-400">{sessionReq.data.user.email}</span>
          </span>
        </div>
        <Button
          variant="outline"
          size="xs"
          className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100 hover:text-amber-950 dark:border-amber-800 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-900/40 dark:hover:text-amber-200"
          onClick={handleStopImpersonating}
          disabled={stopping}
        >
          {stopping ? 'Exiting...' : 'Exit Impersonation'}
        </Button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
