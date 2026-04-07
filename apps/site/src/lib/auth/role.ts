const PRIVILEGED_ROLES = new Set(['owner', 'admin']);

const normalizeRole = (role: unknown): string[] => {
  if (Array.isArray(role)) {
    return role.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
  }

  if (typeof role === 'string') {
    return role
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
};

export const isOwnerOrAdminRole = (role: unknown): boolean => {
  const roles = normalizeRole(role);
  return roles.some((v) => PRIVILEGED_ROLES.has(v));
};
