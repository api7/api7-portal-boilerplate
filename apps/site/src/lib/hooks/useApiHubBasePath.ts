'use client';

import { PATH_API_HUB } from '@/constants/path-prefix';
import { useActiveOrganizationSlug } from './useActiveOrganizationSlug';

export const useApiHubBasePath = () => {
  const activeOrgSlug = useActiveOrganizationSlug();
  return activeOrgSlug ? `/${activeOrgSlug}${PATH_API_HUB}` : PATH_API_HUB;
};
