'use client';

import { type FormEvent, useState } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import * as Dialog from '@radix-ui/react-dialog';

import { authClient } from '@/lib/auth/client';

interface CreateOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateOrganizationModal = ({
  open,
  onOpenChange,
}: CreateOrganizationModalProps) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setName('');
      setError('');
      setLoading(false);
    }
    onOpenChange(isOpen);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    setError('');
    setLoading(true);

    const tryCreate = async (attempt: number): Promise<void> => {
      const slug = nanoid(8);
      const { data, error: apiError } = await authClient.organization.create({
        name: trimmedName,
        slug,
      });

      if (apiError) {
        const isSlugConflict =
          apiError.status === 422 &&
          /slug|unique|already exists/i.test(apiError.message ?? '');
        if (attempt === 0 && isSlugConflict) {
          return tryCreate(1);
        }
        toast.error(apiError.message || 'Failed to create organization');
        return;
      }

      const actualSlug = data?.slug || slug;
      toast.success(
        `Organization created. Slug: ${actualSlug} (editable in settings)`
      );
      handleClose(false);
    };

    try {
      await tryCreate(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg"
          onInteractOutside={(e) => { if (loading) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (loading) e.preventDefault(); }}
        >
          <Dialog.Title className="text-lg font-semibold md:text-xl">
            Create Organization
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground md:text-sm">
            Create an organization to collaborate with other members
          </Dialog.Description>

          <form onSubmit={handleCreate} className="mt-6 space-y-6">
            <div className="space-y-3">
              <label
                htmlFor="org-name"
                className="text-sm font-medium leading-none"
              >
                Name
              </label>
              <input
                id="org-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Organization name"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                disabled={loading}
              />
              {error && (
                <p className="text-sm font-medium text-destructive">{error}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground"
                  disabled={loading}
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
