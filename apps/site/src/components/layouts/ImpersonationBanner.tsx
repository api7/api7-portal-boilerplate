'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { isImpersonatingSession } from '@/lib/auth/admin';
import { Button } from '@/components/ui/button';
import { useActiveOrganizationId } from '@/lib/hooks/useActiveOrganizationId';

const ImpersonationBanner = () => {
  const queryClient = useQueryClient();
  const sessionReq = authClient.useSession();
  const [stopping, setStopping] = useState(false);

  const impersonatedBy = sessionReq.data?.session?.impersonatedBy;
  const isImpersonating = isImpersonatingSession(impersonatedBy);

  const { activeOrg, orgs, isLoading: orgsLoading } = useActiveOrganizationId();

  const activeOrganizationName = useMemo(() => {
    return activeOrg?.name ?? 'Unknown organization';
  }, [activeOrg]);

  if (!isImpersonating || !sessionReq.data?.user) {
    return null;
  }

  const handleStopImpersonating = async () => {
    setStopping(true);
    try {
      await authClient.admin.stopImpersonating();
      await queryClient.refetchQueries({ queryKey: ['session'] });
      window.location.assign('/');
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="sticky top-0 z-[60] border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-3 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="text-amber-900">
            Currently in Impersonation Mode
            <span className="mx-1.5 text-amber-400">·</span>
            <span className="font-medium">{activeOrganizationName}</span>
            <span className="mx-1.5 text-amber-400">·</span>
            <span className="text-amber-700">{sessionReq.data.user.email}</span>
          </span>
        </div>
        <Button
          variant="outline"
          size="xs"
          className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100 hover:text-amber-950"
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
