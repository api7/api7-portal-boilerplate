import 'server-only';
import { getConfig } from '@/lib/config';

export const isPlatformAdmin = (userId: string | null | undefined) => {
  if (!userId) {
    return false;
  }

  return getConfig().auth.adminUserIds.includes(userId);
};
