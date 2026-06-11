'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';

import type { DocNode } from '@/lib/docs/content';
import DocsSidebar from '@/components/docs/DocsSidebar';

/**
 * Mobile docs navigation: a hamburger button that opens the sidebar in a
 * slide-in drawer. Hidden on lg+ where the static sidebar is shown. Closes
 * automatically on navigation.
 */
export default function MobileDocsNav({ tree }: { tree: DocNode[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted">
        <Menu className="size-4" />
        Menu
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] overflow-y-auto bg-background p-4 shadow-lg data-[state=open]:animate-in data-[state=open]:slide-in-from-left">
          <div className="mb-4 flex items-center justify-between">
            <DialogPrimitive.Title className="text-sm font-semibold">
              Documentation
            </DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <DocsSidebar tree={tree} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
