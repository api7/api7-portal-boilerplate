import Image from 'next/image';
import HeaderNavbar from './HeaderNavbar';
import UserMenu from './UserMenu';

type HeaderProps = {
  title?: string;
};

const Header = ({ title = 'Developer Portal' }: HeaderProps) => {
  return (
    <>
      <nav className="navbar flex sticky top-0 h-16 font-medium align-middle bg-white shadow-sm z-50">
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
          <HeaderNavbar title={title} />
        </div>

        <div className="flex mr-5 items-center-safe">
          <UserMenu />
        </div>
      </nav>
    </>
  );
};

export default Header;
