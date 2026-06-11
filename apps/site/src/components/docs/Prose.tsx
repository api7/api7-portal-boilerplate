import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Article wrapper for rendered Markdown. `prose` tokens are mapped to the
 * shadcn design tokens in globals.css, and those tokens flip under `.dark`, so
 * no `prose-invert` is needed — light and dark both follow the theme.
 */
export default function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn('prose max-w-none', className)}>{children}</article>
  );
}
