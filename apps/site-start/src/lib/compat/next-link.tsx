import { Link as RouterLink } from '@tanstack/react-router';
import type { ComponentPropsWithoutRef, PropsWithChildren } from 'react';

type NextLinkProps = PropsWithChildren<
  { className?: string; href: string; to?: string } & Pick<
    ComponentPropsWithoutRef<'a'>,
    'aria-disabled' | 'tabIndex' | 'onClick'
  >
>;

// `next/link` shim backed by TanStack Router, for vendored components still
// written against Next.js's Link component. Adapts the `href`-based shape
// better-auth-ui expects onto TanStack Router's `to`.
export default function Link({ href, to, ...props }: NextLinkProps) {
  return <RouterLink to={to ?? href} {...props} />;
}
