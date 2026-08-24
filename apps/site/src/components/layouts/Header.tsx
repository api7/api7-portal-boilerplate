import HeaderNavbar from './HeaderNavbar';
import UserMenu from './UserMenu';

type HeaderProps = {
  title?: string;
  authorized: boolean;
  canAccessAdmin: boolean;
  showApiHub: boolean;
};

const Header = ({
  title = 'Developer Portal',
  authorized,
  canAccessAdmin,
  showApiHub,
}: HeaderProps) => {
  return (
    <>
      <nav className="navbar flex sticky top-0 h-(--app-header-height) font-medium align-middle bg-background border-b border-border z-50">
        <div className="flex-1 flex items-center gap-1 pl-2">
          <img
            src="/favicon.ico"
            alt=""
            width={27}
            height={27}
            className="h-6.75 w-6.75"
            loading="eager"
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
