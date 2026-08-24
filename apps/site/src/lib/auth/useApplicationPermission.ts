'use client';

import { useQuery } from '@tanstack/react-query';

import { authClient } from '@/lib/auth/client';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import { isOwnerOrAdminRole } from './permissions';

export const useCanManageApplications = () => {
  const slug = useOrganizationSlug();

  const { data: activeMemberRole, isPending } = useQuery({
    queryKey: ['active-member-role', slug],
    queryFn: async () => {
      const { data } = await authClient.organization.getActiveMemberRole({
        query: slug ? { organizationSlug: slug } : undefined,
      });
      return data?.role ?? null;
    },
    enabled: !!slug,
  });

  return {
    canManageApplications: isOwnerOrAdminRole(activeMemberRole),
    activeMemberRole,
    isLoadingRole: isPending,
  };
};
