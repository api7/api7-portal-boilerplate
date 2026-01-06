'use client';

import { useMemo, useState, type MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useBoolean } from 'ahooks';
import { headerNavs } from '@/lib/config/navs';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth/client';

type HeaderNavbarProps = { title: string };

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

const HeaderNavbar = ({ title }: HeaderNavbarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const session = authClient.useSession();
  const authorized = !!session.data?.user;
  const activeHref = useMemo(() => pathname.split('/')[1] || '', [pathname]);
  const [lastHoverIdx, setLastHoverIdx] = useState(-1);

  const hoverConf = (href: string, idx: number, className?: string) => ({
    className: cn(
      'nav',
      activeHref === href.split('/')[1] && 'active',
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
      {headerNavs.filter(v => !v.meta?.requireAuth || authorized).map((v, i) => (
        <AnchorHoverAni key={v.title} {...hoverConf(v.href, i + 1)} {...v}>
          {v.title}
        </AnchorHoverAni>
      ))}
    </div>
  );
};

export default HeaderNavbar;

