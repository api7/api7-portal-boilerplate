'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';

type ImpersonateOwnerButtonProps = {
  userId: string;
  disabled?: boolean;
};

const ImpersonateOwnerButton = ({
  userId,
  disabled = false,
}: ImpersonateOwnerButtonProps) => {
  const [pending, setPending] = useState(false);

  const handleImpersonate = async () => {
    setPending(true);
    try {
      const result = await authClient.admin.impersonateUser({ userId });
      if (result.error) {
        console.error('Failed to impersonate user:', result.error);
        toast.error(result.error.message || 'Failed to impersonate user');
        return;
      }
      window.location.assign('/');
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleImpersonate}
      disabled={disabled || pending}
    >
      {pending ? 'Impersonating...' : 'Impersonate'}
    </Button>
  );
};

export default ImpersonateOwnerButton;
