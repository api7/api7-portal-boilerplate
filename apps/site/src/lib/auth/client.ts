import { createAuthClient } from 'better-auth/react';
import { AUTH_BASE_PATH } from '@/constants/api-prefix';
import {
  adminClient,
  organizationClient,
  magicLinkClient,
  genericOAuthClient,
  twoFactorClient,
} from 'better-auth/client/plugins';
import { ac, roles } from './permissions';

export const authClient = createAuthClient({
  basePath: AUTH_BASE_PATH,
  plugins: [
    adminClient(),
    twoFactorClient({ twoFactorPage: '/auth/two-factor' }),
    organizationClient({
      ac,
      roles,
    }),
    magicLinkClient(),
    genericOAuthClient(),
  ],
});
