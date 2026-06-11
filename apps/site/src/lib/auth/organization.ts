import { ac, roles } from './permissions';

export const getOrganizationPluginOptions = (
  requireEmailVerificationOnInvitation: boolean,
) => ({
  ac,
  roles,
  requireEmailVerificationOnInvitation,
});
