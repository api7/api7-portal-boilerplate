import Image from 'next/image';

import { getCurrentPlatformAdminSession } from '@/lib/auth/platform-admin.server';
import { getConfig } from '@/lib/config';
import { verifySession } from '@/lib/dal/util';

import HeaderNavbar from './HeaderNavbar';
import UserMenu from './UserMenu';

type HeaderProps = {
  title?: string;
};

const Header = async ({ title = 'Developer Portal' }: HeaderProps) => {
  const session = await verifySession({ redirect: false });
  const authorized = !!session?.user;
  const canAccessAdmin =
    authorized && !!(await getCurrentPlatformAdminSession());
  const { app } = getConfig();
  const showApiHub = app.apiHub?.enabled !== false;

  return (
    <>
      <nav className="navbar flex sticky top-0 h-(--app-header-height) font-medium align-middle bg-background border-b border-border z-50">
        <div className="flex-1 flex items-center gap-1 pl-2">
          <Image
            src="/favicon.ico"
            alt={title}
            width={27}
            height={27}
            className="h-6.75 w-6.75"
            loading="eager"
            priority
          />
          <HeaderNavbar title={title} authorized={authorized} showApiHub={showApiHub} />
        </div>

        <div className="flex mr-5 items-center-safe">
          <UserMenu authorized={authorized} canAccessAdmin={canAccessAdmin} />
        </div>
      </nav>
    </>
  );
};

export default Header;
