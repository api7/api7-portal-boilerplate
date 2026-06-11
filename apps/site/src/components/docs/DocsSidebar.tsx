'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import type { DocNode, DocSection } from '@/lib/docs/content';
import { cn } from '@/lib/utils';

/**
 * Docs navigation rendered from the content tree (mirrors the directory
 * structure). Sub-directories are collapsible sections. Only the section(s) on
 * the path to the active page are expanded (so you can always see where you
 * are, incl. after a search jump); unrelated sections stay collapsed. Manual
 * toggles are preserved.
 */
export default function DocsSidebar({ tree }: { tree: DocNode[] }) {
  const pathname = usePathname();
  return (
    <nav className="text-sm" aria-label="Docs navigation">
      <NodeList nodes={tree} pathname={pathname} depth={0} />
    </nav>
  );
}

/** True when the active page lives anywhere inside this node's subtree. */
function containsActive(node: DocNode, pathname: string): boolean {
  if (node.type === 'doc') return node.href === pathname;
  return node.children.some((c) => containsActive(c, pathname));
}

function NodeList({
  nodes,
  pathname,
  depth,
}: {
  nodes: DocNode[];
  pathname: string;
  depth: number;
}) {
  return (
    <ul
      className={cn(
        'space-y-0.5',
        depth > 0 && 'ml-2.5 border-l border-border pl-2.5'
      )}
    >
      {nodes.map((node) =>
        node.type === 'section' ? (
          <SectionItem
            key={`section:${node.title}`}
            node={node}
            pathname={pathname}
            depth={depth}
          />
        ) : (
          <li key={node.href}>
            <Link
              href={node.href}
              aria-current={pathname === node.href ? 'page' : undefined}
              className={cn(
                'block rounded-md px-3 py-1.5 transition-colors',
                pathname === node.href
                  ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {node.title}
            </Link>
          </li>
        )
      )}
    </ul>
  );
}

function SectionItem({
  node,
  pathname,
  depth,
}: {
  node: DocSection;
  pathname: string;
  depth: number;
}) {
  const active = containsActive(node, pathname);
  const [open, setOpen] = useState(active);
  const [prevActive, setPrevActive] = useState(active);
  // Expand when the active page enters this section (e.g. after a search jump
  // or link click). Never force-close, so manual toggles stick.
  if (prevActive !== active) {
    setPrevActive(active);
    if (active) setOpen(true);
  }

  return (
    <li className="mt-3 first:mt-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase transition-colors hover:text-foreground"
      >
        <span>{node.title}</span>
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 transition-transform duration-200',
            open && 'rotate-90'
          )}
        />
      </button>
      {open && (
        <div className="mt-0.5">
          <NodeList
            nodes={node.children}
            pathname={pathname}
            depth={depth + 1}
          />
        </div>
      )}
    </li>
  );
}
