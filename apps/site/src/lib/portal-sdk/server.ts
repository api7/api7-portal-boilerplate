import 'server-only';

import { API7Portal } from '@api7/portal-sdk';

import { getConfig } from '@/lib/config';

const portalConfig = getConfig().portal;

export const portal = new API7Portal({
  endpoint: portalConfig.url,
  token: portalConfig.token,
});
