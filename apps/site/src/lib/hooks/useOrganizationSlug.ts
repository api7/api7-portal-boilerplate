'use client';

import { usePathname } from 'next/navigation';

export const NON_ORG_PREFIX_ROUTE_SEGMENTS = new Set([
  'auth',
  'account',
  'user-profile',
]);
export const RESERVED_FIRST_SEGMENTS = new Set([
  ...NON_ORG_PREFIX_ROUTE_SEGMENTS,
  'api-hub',
  'dashboard',
  'organization',
]);

export const useOrganizationSlug = () => {
  const pathname = usePathname();
  const first = pathname.split('/').filter(Boolean)[0];

  if (!first || RESERVED_FIRST_SEGMENTS.has(first)) {
    return null;
  }

  return first;
};
