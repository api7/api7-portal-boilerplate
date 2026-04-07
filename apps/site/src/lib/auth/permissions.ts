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
