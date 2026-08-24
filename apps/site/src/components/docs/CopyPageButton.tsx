'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@api7/portal-ui/components/ui/dropdown-menu';
import { useLocation } from '@tanstack/react-router';
import { Check, ChevronDown, Copy, ExternalLink, FileText } from 'lucide-react';

import { useClipboard } from '@/lib/hooks/useClipboard';

export default function CopyPageButton({ title }: { title: string }) {
  const { pathname } = useLocation();
  const { hasCopied, onCopy } = useClipboard();

  const fetchMarkdown = () => fetch(`${pathname}.md`).then((r) => r.text());

  const copyPage = async () => {
    onCopy(await fetchMarkdown());
  };

  const openInLLM = async (base: string) => {
    const text = await fetchMarkdown();
    const prompt = `Read this documentation page titled "${title}" and help me with it:\n\n${text}`;
    window.open(
      base + encodeURIComponent(prompt),
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div className="mt-1.5 inline-flex shrink-0 items-center rounded-md border border-border text-xs font-medium text-muted-foreground">
      <button
        type="button"
        onClick={copyPage}
        className="inline-flex items-center gap-1.5 rounded-l-md px-2.5 py-1.5 transition-colors hover:bg-muted hover:text-foreground"
      >
        {hasCopied ? (
          <Check className="size-3.5 text-primary" />
        ) : (
          <Copy className="size-3.5" />
        )}
        {hasCopied ? 'Copied' : 'Copy page'}
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
          <DropdownMenuItem
            onClick={() =>
              window.open(`${pathname}.md`, '_blank', 'noopener,noreferrer')
            }
          >
            <FileText className="size-4" />
            View as Markdown
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openInLLM('https://chatgpt.com/?q=')}
          >
            <ExternalLink className="size-4" />
            Open in ChatGPT
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openInLLM('https://claude.ai/new?q=')}
          >
            <ExternalLink className="size-4" />
            Open in Claude
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
