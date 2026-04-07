'use client';

import { useMemo, useState, type MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useBoolean } from 'ahooks';
import { headerNavs } from '@/lib/config/navs';
import {
  PATH_API_HUB,
  PATH_APPLICATIONS,
  PATH_DASHBOARD_ORGANIZATIONS,
} from '@/constants/path-prefix';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth/client';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import { useApiHubBasePath } from '@/lib/hooks/useApiHubBasePath';

type HeaderNavbarProps = {
  title: string;
  canAccessDashboard: boolean;
};

const AnchorHoverAni = (
  props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    hoverDir: 'forward' | 'backward';
  }
) => {
  const { hoverDir, children, ...rest } = props;
  const [hovered, hoveredOp] = useBoolean();
  return (
    <a
      onMouseEnter={hoveredOp.setTrue}
      onMouseLeave={hoveredOp.setFalse}
      {...rest}
    >
      {hovered && <div className={hoverDir} />}
      {children}
    </a>
  );
};

const HeaderNavbar = ({ title, canAccessDashboard }: HeaderNavbarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const session = authClient.useSession();
  const authorized = !!session.data?.user;
  const orgSlug = useOrganizationSlug();
  const apiHubBasePath = useApiHubBasePath();
  const activeHref = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    return orgSlug ? (segments[1] || '') : (segments[0] || '');
  }, [pathname, orgSlug]);
  const [lastHoverIdx, setLastHoverIdx] = useState(-1);

  const getNavKey = (href: string) => {
    if (href.includes(PATH_API_HUB)) return 'api-hub';
    if (href.includes(PATH_APPLICATIONS)) return 'applications';
    if (href.includes(PATH_DASHBOARD_ORGANIZATIONS)) return 'dashboard';
    return href.split('/').filter(Boolean)[0] || '';
  };

  const navs = canAccessDashboard
    ? [
        ...headerNavs,
        {
          title: 'Dashboard',
          href: PATH_DASHBOARD_ORGANIZATIONS,
          meta: {
            requireAuth: true,
            skipOrgPrefix: true,
          },
        },
      ]
    : headerNavs;

  const hoverConf = (href: string, idx: number, className?: string) => ({
    className: cn(
      'nav',
      activeHref === getNavKey(href) && 'active',
      className
    ),
    hoverDir: (lastHoverIdx > idx ? 'backward' : 'forward') as 'forward' | 'backward',
    onMouseOut: () => setLastHoverIdx(idx),
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      router.push(href);
    },
  });

  return (
    <div className="flex" id="header-navbar">
      <AnchorHoverAni href="/" {...hoverConf('/', 0, 'nav flex mr-4 font-bold')} style={{ color: 'rgba(0, 0, 0, 0.88)' }}>
        {title}
      </AnchorHoverAni>
      {navs.filter(v => !v.meta?.requireAuth || authorized).map((v, i) => {
        const href =
          v.href === PATH_API_HUB && authorized
            ? apiHubBasePath
            : v.meta?.requireAuth && orgSlug && !v.meta?.skipOrgPrefix
              ? `/${orgSlug}${v.href}`
              : v.href;
        return (
          <AnchorHoverAni key={v.title} {...hoverConf(href, i + 1)} {...v} href={href}>
            {v.title}
          </AnchorHoverAni>
        );
      })}
    </div>
  );
};

export default HeaderNavbar;
