'use client';

import { useBoolean } from 'ahooks';
import { usePathname, useRouter } from 'next/navigation';
import { type MouseEvent, useMemo, useState } from 'react';

import { PATH_API_HUB, PATH_APPLICATIONS } from '@/constants/path-prefix';
import { headerNavs } from '@/lib/config/navs';
import { useApiHubBasePath } from '@/lib/hooks/useApiHubBasePath';
import { useOrganizationSlug } from '@/lib/hooks/useOrganizationSlug';
import { cn } from '@/lib/utils';

type HeaderNavbarProps = {
  title: string;
  authorized: boolean;
};

const AnchorHoverAni = (
  props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    hoverDir: 'forward' | 'backward';
  },
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

const HeaderNavbar = ({ title, authorized }: HeaderNavbarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const orgSlug = useOrganizationSlug();
  const apiHubBasePath = useApiHubBasePath();
  const activeHref = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    return orgSlug ? segments[1] || '' : segments[0] || '';
  }, [pathname, orgSlug]);
  const [lastHoverIdx, setLastHoverIdx] = useState(-1);

  const getNavKey = (href: string) => {
    if (href.includes(PATH_API_HUB)) return 'api-hub';
    if (href.includes(PATH_APPLICATIONS)) return 'applications';
    return href.split('/').filter(Boolean)[0] || '';
  };

  const navs = headerNavs;

  const hoverConf = (href: string, idx: number, className?: string, active?: boolean) => ({
    className: cn('nav', (active ?? activeHref === getNavKey(href)) && 'active', className),
    hoverDir: (lastHoverIdx > idx ? 'backward' : 'forward') as
      | 'forward'
      | 'backward',
    onMouseOut: () => setLastHoverIdx(idx),
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      router.push(href);
    },
  });

  return (
    <div className="flex" id="header-navbar">
      <AnchorHoverAni
        href="/"
        {...hoverConf('/', 0, 'nav flex mr-4 font-bold !text-foreground', false)}
      >
        {title}
      </AnchorHoverAni>
      {navs
        .filter((v) => !v.meta?.requireAuth || authorized)
        .map((v, i) => {
          const href =
            v.href === PATH_API_HUB && authorized && orgSlug
              ? apiHubBasePath
              : v.meta?.requireAuth && orgSlug && !v.meta?.skipOrgPrefix
                ? `/${orgSlug}${v.href}`
                : v.href;
          return (
            <AnchorHoverAni
              key={v.title}
              {...hoverConf(href, i + 1)}
              {...v}
              href={href}
            >
              {v.title}
            </AnchorHoverAni>
          );
        })}
    </div>
  );
};

export default HeaderNavbar;
