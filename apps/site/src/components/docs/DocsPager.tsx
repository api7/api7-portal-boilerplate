import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import type { DocLeaf } from '@/lib/docs/content';
import { cn } from '@/lib/utils';

/** Previous / next page links at the bottom of a doc, following sidebar order. */
export default function DocsPager({
  prev,
  next,
}: {
  prev?: DocLeaf;
  next?: DocLeaf;
}) {
  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex items-stretch gap-4 border-t border-border pt-6"
    >
      {/* Each link is flex-1, so a single link fills the row instead of
          leaving an awkward empty half on the first/last page. */}
      {prev && (
        <Link
          href={prev.href}
          className="group flex flex-1 flex-col items-start gap-1 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="size-3.5" /> Previous
          </span>
          <span className="font-medium text-foreground">{prev.title}</span>
        </Link>
      )}
      {next && (
        <Link
          href={next.href}
          className={cn(
            'group flex flex-1 flex-col items-end gap-1 rounded-lg border border-border p-4 text-right transition-colors hover:bg-muted/50'
          )}
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            Next <ArrowRight className="size-3.5" />
          </span>
          <span className="font-medium text-foreground">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}
