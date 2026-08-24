import { createAccessControl } from 'better-auth/plugins/access';
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from 'better-auth/plugins/organization/access';

const statement = {
  ...defaultStatements,
  application: ['create', 'update', 'delete'],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  ...ownerAc.statements,
  application: ['create', 'update', 'delete'],
});

export const admin = ac.newRole({
  ...adminAc.statements,
  application: ['create', 'update', 'delete'],
});

export const member = ac.newRole({
  ...memberAc.statements,
});

export const roles = {
  owner,
  admin,
  member,
};

const PRIVILEGED_ROLES = new Set<string>(['owner', 'admin'] satisfies Array<
  keyof typeof roles
>);

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
  const roleList = normalizeRole(role);
  return roleList.some((v) => PRIVILEGED_ROLES.has(v));
};
