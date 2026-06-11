import Image from 'next/image';
import { verifySession } from '@/lib/dal/util';
import { isImpersonatingSession } from '@/lib/auth/admin';
import { isPlatformAdmin } from '@/lib/auth/admin.server';
import HeaderNavbar from './HeaderNavbar';
import UserMenu from './UserMenu';

type HeaderProps = {
  title?: string;
};

const Header = async ({ title = 'Developer Portal' }: HeaderProps) => {
  const session = await verifySession({ redirect: false });
  const authorized = !!session?.user;
  const canAccessAdmin =
    authorized &&
    isPlatformAdmin(session.user) &&
    !isImpersonatingSession(session.session.impersonatedBy);

  return (
    <>
      <nav className="navbar flex sticky top-0 h-[var(--app-header-height)] font-medium align-middle bg-background border-b border-border z-50">
        <div className="flex-1 flex items-center gap-1 pl-2">
          <Image
            src="/favicon.ico"
            alt={title}
            width={27}
            height={27}
            className="h-[27px] w-[27px]"
            loading="eager"
            priority
          />
          <HeaderNavbar title={title} authorized={authorized} />
        </div>

        <div className="flex mr-5 items-center-safe">
          <UserMenu authorized={authorized} canAccessAdmin={canAccessAdmin} />
        </div>
      </nav>
    </>
  );
};

export default Header;
