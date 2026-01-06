import { createAuthClient } from 'better-auth/react';
import { AUTH_BASE_PATH } from '@/constants/api-prefix';
import {
  organizationClient,
  magicLinkClient,
  genericOAuthClient,
} from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  basePath: AUTH_BASE_PATH,
  plugins: [organizationClient(), magicLinkClient(), genericOAuthClient()],
});
