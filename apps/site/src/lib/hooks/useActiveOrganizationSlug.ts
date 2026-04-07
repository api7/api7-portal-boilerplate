'use client';

import { authClient } from '@/lib/auth/client';

export const useActiveOrganizationSlug = () => {
  const { data: activeOrg } = authClient.useActiveOrganization();
  return activeOrg?.slug ?? null;
};
