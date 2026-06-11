import 'server-only';
import { getConfig } from '@/lib/config';

export const isPlatformAdmin = (
  user: { id: string; role?: string | null } | null | undefined,
) => {
  if (!user) return false;
  const { adminUserIds } = getConfig().auth;
  return (adminUserIds.length > 0 && adminUserIds.includes(user.id)) || user.role === 'admin';
};
