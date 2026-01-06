'use client';

import { useEffect, useRef } from 'react';
import { authClient } from '@/lib/auth/client';
import { queryClient } from '@/lib/req';
import { OrganizationSwitcher, UserButton } from '@daveyplate/better-auth-ui';

const UserMenu = () => {
  const req = authClient.useSession();
  const activeOrgId = req.data?.session?.activeOrganizationId;
  const prevOrgIdRef = useRef(activeOrgId);

  // Invalidate queries when active organization changes
  useEffect(() => {
    if (
      prevOrgIdRef.current !== undefined &&
      activeOrgId !== prevOrgIdRef.current
    ) {
      queryClient.invalidateQueries();
      queryClient.refetchQueries();
    }
    prevOrgIdRef.current = activeOrgId;
  }, [activeOrgId]);

  return (
    <div className="flex items-center gap-2">
      {req.data?.user.id && (
        <OrganizationSwitcher variant="secondary" size="icon" hidePersonal />
      )}
      <UserButton size="icon" />
    </div>
  );
};

export default UserMenu;
