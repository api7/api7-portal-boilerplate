'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  PATH_APPROVALS,
  PATH_DASHBOARD_ORGANIZATIONS,
} from '@/constants/path-prefix';
import { cn } from '@/lib/utils';

const ITEMS = [
  { label: 'Organizations', href: PATH_DASHBOARD_ORGANIZATIONS },
  { label: 'Approvals', href: PATH_APPROVALS },
];

/**
 * Sub-navigation for the platform-admin Dashboard section.
 */
const DashboardNav = () => {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex gap-1 border-b border-gray-200">
      {ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
};

export default DashboardNav;
