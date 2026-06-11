'use client';

import {
  type ComponentPropsWithoutRef,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Check, Copy } from 'lucide-react';

import { copyToClipboard } from '@/lib/docs/clipboard';
import { cn } from '@/lib/utils';

/**
 * `pre` replacement for MDX code blocks: keeps Shiki's highlighted output and
 * adds a copy-to-clipboard button (visible on hover / focus).
 */
export default function CodeBlock({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<'pre'>) {
  const preRef = useRef<HTMLPreElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const onCopy = async () => {
    const ok = await copyToClipboard(preRef.current?.innerText ?? '');
    if (ok) {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="group relative">
      <pre
        ref={preRef}
        className={cn(
          'overflow-x-auto rounded-lg border border-border p-4 text-sm leading-relaxed',
          className
        )}
        {...props}
      >
        {children}
      </pre>
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className="absolute top-2 right-2 rounded-md border border-border bg-background/80 p-1.5 text-muted-foreground opacity-70 backdrop-blur transition-opacity hover:text-foreground hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? (
          <Check className="size-3.5 text-primary" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  );
}
