import type { AnchorHTMLAttributes, ComponentPropsWithoutRef } from 'react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import Callout from '@/components/docs/Callout';
import CodeBlock from '@/components/docs/CodeBlock';

/**
 * Maps Markdown/MDX elements onto shadcn-tokened markup. Passed to
 * <MDXRemote components={mdxComponents} />.
 *
 * Most typography comes from the `prose` plugin (see globals.css), so these
 * overrides only add what prose can't: themed links, an inline-code pill,
 * heading scroll-offset for the sticky header, and `not-prose` around Shiki
 * code blocks so their highlighting isn't fought by prose rules.
 *
 * Customize the docs look by editing this file — it's the single styling seam.
 */

// Headings get scroll-margin so in-page anchor jumps clear the sticky Header.
// The heading-id rehype plugin injects the `id`, which flows through via {...props}.
const headingClass = 'scroll-mt-[calc(var(--app-header-height)+1rem)]';

function MdxLink({
  href = '',
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const isInternal = href.startsWith('/') && !href.startsWith('//');
  const linkClass = cn(
    'font-medium text-primary underline-offset-4 hover:underline',
    className
  );

  if (isInternal) {
    return (
      <Link href={href} className={linkClass}>
        {children}
      </Link>
    );
  }

  const isAnchor = href.startsWith('#');
  return (
    <a
      href={href}
      className={linkClass}
      {...(isAnchor ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      {...props}
    >
      {children}
    </a>
  );
}

export const mdxComponents = {
  h1: ({ className, ...props }: ComponentPropsWithoutRef<'h1'>) => (
    <h1 className={cn(headingClass, className)} {...props} />
  ),
  h2: ({ className, ...props }: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className={cn(headingClass, className)} {...props} />
  ),
  h3: ({ className, ...props }: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className={cn(headingClass, className)} {...props} />
  ),
  h4: ({ className, ...props }: ComponentPropsWithoutRef<'h4'>) => (
    <h4 className={cn(headingClass, className)} {...props} />
  ),
  a: MdxLink,
  code: ({ className, ...props }: ComponentPropsWithoutRef<'code'>) => {
    // Block code (from rehype-pretty-code) carries `data-language` and is fully
    // styled by Shiki — leave it alone. Only style standalone inline code.
    const isBlock = 'data-language' in props;
    if (isBlock) return <code className={className} {...props} />;
    return (
      <code
        className={cn(
          'rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.85em]',
          className
        )}
        {...props}
      />
    );
  },
  pre: CodeBlock,
  figure: ({ className, ...props }: ComponentPropsWithoutRef<'figure'>) => {
    // Opt code-block figures out of prose so our pre/code classes fully control
    // them; Shiki provides the background and token colors.
    const isCodeFigure = 'data-rehype-pretty-code-figure' in props;
    return (
      <figure
        className={cn(isCodeFigure && 'not-prose my-4', className)}
        {...props}
      />
    );
  },
  table: ({ className, ...props }: ComponentPropsWithoutRef<'table'>) => (
    <div className="my-6 overflow-x-auto">
      <table className={cn('w-full text-sm', className)} {...props} />
    </div>
  ),
  // Custom MDX components authors can use directly in .mdx files.
  Callout,
};
