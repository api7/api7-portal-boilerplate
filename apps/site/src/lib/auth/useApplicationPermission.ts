'use client';

import { useQuery } from '@tanstack/react-query';
import { authClient } from '@/lib/auth/client';
import { isOwnerOrAdminRole } from './role';

export const useCanManageApplications = () => {
  const session = authClient.useSession();
  const activeOrgId = session.data?.session?.activeOrganizationId;

  const { data: activeMemberRole, isPending } = useQuery({
    queryKey: ['active-member-role', activeOrgId],
    queryFn: async () => {
      const { data } = await authClient.organization.getActiveMemberRole();
      return data?.role ?? null;
    },
    enabled: !!activeOrgId,
  });

  return {
    canManageApplications: isOwnerOrAdminRole(activeMemberRole),
    activeMemberRole,
    isLoadingRole: isPending,
  };
};
