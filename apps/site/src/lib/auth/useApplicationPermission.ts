'use client';

import { useQuery } from '@tanstack/react-query';

import { memberRoleQueryOptions } from '@/lib/query/member-role';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import { isOwnerOrAdminRole } from './permissions';

export const useCanManageApplications = () => {
  const slug = useOrganizationSlug();

  const { data: activeMemberRole, isPending } = useQuery({
    ...memberRoleQueryOptions(slug!),
    enabled: !!slug,
  });

  return {
    canManageApplications: isOwnerOrAdminRole(activeMemberRole),
    activeMemberRole,
    isLoadingRole: isPending,
  };
};
