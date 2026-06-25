'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Check, ChevronDown, Copy, ExternalLink, FileText } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { copyToClipboard } from '@/lib/docs/clipboard';

export default function CopyPageButton({ title }: { title: string }) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const fetchMarkdown = () => fetch(`${pathname}.md`).then((r) => r.text());

  const copyPage = async () => {
    const text = await fetchMarkdown();
    if (await copyToClipboard(text)) {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    }
  };

  const openInLLM = async (base: string) => {
    const text = await fetchMarkdown();
    const prompt = `Read this documentation page titled "${title}" and help me with it:\n\n${text}`;
    window.open(base + encodeURIComponent(prompt), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="inline-flex items-center rounded-md border border-border text-xs font-medium text-muted-foreground">
      <button
        type="button"
        onClick={copyPage}
        className="inline-flex items-center gap-1.5 rounded-l-md px-2.5 py-1.5 transition-colors hover:bg-muted hover:text-foreground"
      >
        {copied ? (
          <Check className="size-3.5 text-primary" />
        ) : (
          <Copy className="size-3.5" />
        )}
        {copied ? 'Copied' : 'Copy page'}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More options"
          className="rounded-r-md border-l border-border px-1.5 py-1.5 transition-colors hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground"
        >
          <ChevronDown className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={copyPage}>
            <Copy className="size-4" />
            Copy page
            <span className="ml-auto text-xs text-muted-foreground">
              Markdown
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(`${pathname}.md`, '_blank', 'noopener,noreferrer')}>
            <FileText className="size-4" />
            View as Markdown
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openInLLM('https://chatgpt.com/?q=')}>
            <ExternalLink className="size-4" />
            Open in ChatGPT
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openInLLM('https://claude.ai/new?q=')}>
            <ExternalLink className="size-4" />
            Open in Claude
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
