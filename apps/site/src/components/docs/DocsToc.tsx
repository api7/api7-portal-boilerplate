'use client';

import { useEffect, useState } from 'react';

import type { DocHeading } from '@/lib/docs/content';
import { cn } from '@/lib/utils';

/**
 * On-page table of contents with scroll-spy. Headings (with their ids) are
 * extracted at build time and passed in, so the list renders on the server and
 * the IntersectionObserver only drives the active highlight.
 */
export default function DocsToc({ headings }: { headings: DocHeading[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          // IntersectionObserver doesn't guarantee entry order; pick the
          // topmost heading so the highlight doesn't jump to the wrong item.
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      // Activate a heading once it passes below the sticky header and keep it
      // active until the next one reaches the same band near the top.
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="text-sm" aria-label="On this page">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase">
        On this page
      </p>
      <ul className="space-y-1.5 border-l border-border">
        {headings.map((h) => (
          <li key={h.id} className={cn(h.level === 3 && 'ml-3')}>
            <a
              href={`#${h.id}`}
              className={cn(
                '-ml-px block border-l border-transparent pl-3 transition-colors',
                activeId === h.id
                  ? 'border-primary font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
