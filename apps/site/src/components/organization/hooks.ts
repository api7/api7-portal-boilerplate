import { PATH_ROOT } from '@/constants/path-prefix';
import { authClient } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';

export const useRedirectWhenHasOrganization = () => {
  const router = useRouter();

  return () => {
    authClient.organization.list().then(({ data }) => {
      if (data?.length) router.push(PATH_ROOT);
    });
  };
};
