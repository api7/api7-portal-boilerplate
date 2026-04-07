import { PATH_API_HUB, PATH_APPLICATIONS } from '@/constants/path-prefix';

export type HeaderNav = {
  title: string;
  href: string;
  meta?: {
    requireAuth?: boolean;
    skipOrgPrefix?: boolean;
  };
};

export const headerNavs: HeaderNav[] = [
  {
    title: 'API Hub',
    href: PATH_API_HUB,
  },
  {
    title: 'My Applications',
    href: PATH_APPLICATIONS,
    meta: {
      requireAuth: true,
    },
  },
];
