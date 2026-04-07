'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PATH_ROOT } from '@/constants/path-prefix';

type NoAccessToastProps = {
  slug?: string;
};

const NoAccessToast = ({ slug }: NoAccessToastProps) => {
  const router = useRouter();

  useEffect(() => {
    toast.error('No Permission', {
      description: `You don't have permission to access organization "${slug ?? ''}".`,
      duration: 5000,
    });
    // Clean query params to prevent repeated toasts when users refresh the page.
    router.replace(PATH_ROOT);
  }, [router, slug]);

  return null;
};

export default NoAccessToast;
