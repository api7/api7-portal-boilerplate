import {
  PATH_API_HUB,
  PATH_APPLICATIONS,
  PATH_DOCS,
} from '@/constants/path-prefix';

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
    title: 'Docs',
    href: PATH_DOCS,
  },
  {
    title: 'My Applications',
    href: PATH_APPLICATIONS,
    meta: {
      requireAuth: true,
    },
  },
];
