'use client';

import { FileText, Search } from 'lucide-react';
import MiniSearch from 'minisearch';
import { useRouter } from 'next/navigation';
import { Dialog as DialogPrimitive } from 'radix-ui';
import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  $searchOpen,
  closeSearch,
  openSearch,
} from '@/components/docs/searchStore';
import type { SearchDoc } from '@/lib/docs/content';
import { cn } from '@/lib/utils';
import { useStore } from '@nanostores/react';

type Indexed = SearchDoc & { id: string; headingsText: string };

/** Characters of body text to show on each side of the matched term. */
const SNIPPET_RADIUS = 80;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a plain-text excerpt of `text` centred on the first matched term, so
 * the result shows *why* it matched. `terms` are MiniSearch's matched document
 * terms (e.g. a fuzzy search for "sun" yields "run") — not the raw query — so
 * the excerpt highlights the word that actually lives on the page. Falls back
 * to the leading text when none of the terms appear in the body (e.g. the hit
 * was in the title only).
 */
function buildSnippet(text: string, terms: string[]): string {
  if (!text) return '';

  const lower = text.toLowerCase();
  let hit = -1;
  let hitLen = 0;
  for (const term of terms) {
    const i = lower.indexOf(term.toLowerCase());
    if (i !== -1 && (hit === -1 || i < hit)) {
      hit = i;
      hitLen = term.length;
    }
  }

  if (hit === -1) {
    const lead = text.slice(0, SNIPPET_RADIUS * 2).trimEnd();
    return lead.length < text.length ? `${lead}…` : lead;
  }

  let start = Math.max(0, hit - SNIPPET_RADIUS);
  let end = Math.min(text.length, hit + hitLen + SNIPPET_RADIUS);
  // Snap to word boundaries so the excerpt doesn't begin/end mid-word.
  if (start > 0) {
    const sp = text.indexOf(' ', start);
    if (sp !== -1 && sp < hit) start = sp + 1;
  }
  if (end < text.length) {
    const sp = text.lastIndexOf(' ', end);
    if (sp !== -1 && sp > hit + hitLen) end = sp;
  }

  const core = text.slice(start, end).trim();
  return `${start > 0 ? '…' : ''}${core}${end < text.length ? '…' : ''}`;
}

/** Render `snippet`, wrapping every matched term occurrence in a highlight. */
function HighlightedSnippet({
  snippet,
  terms,
}: {
  snippet: string;
  terms: string[];
}) {
  const pattern = useMemo(() => {
    const parts = terms.filter(Boolean).map(escapeRegExp);
    return parts.length ? new RegExp(`(${parts.join('|')})`, 'gi') : null;
  }, [terms]);

  if (!pattern) return <>{snippet}</>;

  // `split` with a single capture group alternates text/match — odd indices
  // are the matched terms.
  return (
    <>
      {snippet.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-[3px] bg-primary/15 px-0.5 font-medium text-foreground"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

/**
 * Global docs search: ⌘K / Ctrl+K opens a command palette. The index is
 * fetched once from /docs-search and searched in-browser with MiniSearch — no
 * backend, no third-party service. A single instance is mounted in the docs
 * layout; triggers open it via the shared nanostore.
 */
export default function DocsSearch() {
  const open = useStore($searchOpen);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [mini, setMini] = useState<MiniSearch<Indexed> | null>(null);
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setActive(0);
  }
  const inputRef = useRef<HTMLInputElement>(null);

  // Global ⌘K / Ctrl+K shortcut.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lazy-load + build the index the first time the dialog opens.
  useEffect(() => {
    if (!open || mini) return;
    let cancelled = false;
    (async () => {
      try {
        const docs: SearchDoc[] = await fetch('/docs-search').then((r) =>
          r.json(),
        );
        if (cancelled) return;
        const ms = new MiniSearch<Indexed>({
          fields: ['title', 'headingsText', 'text'],
          storeFields: ['title', 'href', 'description', 'text'],
          searchOptions: {
            boost: { title: 3, headingsText: 2 },
            prefix: true,
            fuzzy: 0.2,
          },
        });
        ms.addAll(
          docs.map((d) => ({
            ...d,
            id: d.href,
            headingsText: d.headings.join(' '),
          })),
        );
        setMini(ms);
      } catch {
        /* index unavailable — search stays empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mini]);

  const results = useMemo(() => {
    if (!mini || !query.trim()) return [];
    return mini.search(query).slice(0, 8);
  }, [mini, query]);


  const go = (href: string) => {
    closeSearch();
    setQuery('');
    router.push(href);
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length === 0) return;
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length === 0) return;
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active].href as string);
    }
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => (o ? openSearch() : closeSearch())}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          className="fixed top-[15vh] left-1/2 z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">
            Search documentation
          </DialogPrimitive.Title>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Search documentation…"
              className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {query.trim() && results.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No results for “{query}”.
              </p>
            )}
            {results.map((r, i) => {
              const snippet = buildSnippet(r.text as string, r.terms);
              return (
                <button
                  key={r.id}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.href as string)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left',
                    i === active ? 'bg-accent text-accent-foreground' : '',
                  )}
                >
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {r.title as string}
                    </span>
                    {snippet ? (
                      <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        <HighlightedSnippet snippet={snippet} terms={r.terms} />
                      </span>
                    ) : (
                      (r.description as string) && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {r.description as string}
                        </span>
                      )
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
