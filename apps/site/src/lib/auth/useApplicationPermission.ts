'use client';

import { authClient } from '@/lib/auth/client';
import { useActiveOrganizationId } from '@/lib/hooks/useActiveOrganizationId';
import { useQuery } from '@tanstack/react-query';

import { isOwnerOrAdminRole } from './role';

export const useCanManageApplications = () => {
  const { activeOrgId, slug } = useActiveOrganizationId();

  const { data: activeMemberRole, isPending } = useQuery({
    queryKey: ['active-member-role', activeOrgId],
    queryFn: async () => {
      const { data } = await authClient.organization.getActiveMemberRole({
        query: slug ? { organizationSlug: slug } : undefined,
      });
      return data?.role ?? null;
    },
    enabled: !!activeOrgId && !!slug,
  });

  return {
    canManageApplications: isOwnerOrAdminRole(activeMemberRole),
    activeMemberRole,
    isLoadingRole: isPending,
  };
};
