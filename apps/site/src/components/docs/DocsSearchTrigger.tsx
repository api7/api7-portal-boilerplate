'use client';

import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { openSearch } from '@/components/docs/searchStore';

/**
 * Search box-styled button that opens the docs search dialog. The dialog itself
 * is a single instance mounted in the layout; this just flips the shared store.
 */
export default function DocsSearchTrigger({
  className,
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={openSearch}
      className={cn(
        'flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted',
        className
      )}
    >
      <Search className="size-4 shrink-0" />
      <span className="flex-1 text-left">Search…</span>
      <kbd className="hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}
