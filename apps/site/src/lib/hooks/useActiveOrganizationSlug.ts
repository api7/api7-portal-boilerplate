'use client';

import { useActiveOrganizationId } from './useActiveOrganizationId';

/**
 * Returns the slug of the currently active organization (from URL).
 */
export const useActiveOrganizationSlug = () => {
  return useActiveOrganizationId().slug;
};
