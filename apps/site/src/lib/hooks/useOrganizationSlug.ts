'use client';

import { RESERVED_FIRST_SEGMENTS } from '@/constants/common';
import { usePathname } from 'next/navigation';

export {
  NON_ORG_PREFIX_ROUTE_SEGMENTS,
  RESERVED_FIRST_SEGMENTS,
} from '@/constants/common';

export const useOrganizationSlug = () => {
  const pathname = usePathname();
  const first = pathname.split('/').filter(Boolean)[0];

  if (!first || RESERVED_FIRST_SEGMENTS.has(first)) {
    return null;
  }

  return first;
};
