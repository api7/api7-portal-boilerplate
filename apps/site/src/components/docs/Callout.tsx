import type { ReactNode } from 'react';
import { Info, Lightbulb, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Admonition/callout block for docs. Use in MDX as:
 *   <Callout type="warning" title="Heads up">…</Callout>
 * Styled with shadcn tokens; `not-prose` so prose rules don't fight it.
 */
const VARIANTS = {
  note: {
    icon: Info,
    box: 'border-border bg-muted/40',
    icon_cls: 'text-muted-foreground',
  },
  tip: {
    icon: Lightbulb,
    box: 'border-border bg-accent/40',
    icon_cls: 'text-primary',
  },
  warning: {
    icon: TriangleAlert,
    box: 'border-destructive/30 bg-destructive/5',
    icon_cls: 'text-destructive',
  },
} as const;

export default function Callout({
  type = 'note',
  title,
  children,
}: {
  type?: keyof typeof VARIANTS;
  title?: string;
  children: ReactNode;
}) {
  const v = VARIANTS[type] ?? VARIANTS.note;
  const Icon = v.icon;
  return (
    <div
      className={cn(
        'not-prose my-5 flex gap-3 rounded-lg border p-4 text-sm',
        v.box
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', v.icon_cls)} />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-medium text-foreground">{title}</p>}
        <div className="text-muted-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
          {children}
        </div>
      </div>
    </div>
  );
}
