import 'server-only';
import { API7Portal } from '@api7/portal-sdk';
import { getConfig } from '../config';
import { getDeveloperIdFromSession } from '../dal';

const portalConfig = getConfig().portal;

export const portal = new API7Portal({
  endpoint: portalConfig.url,
  token: portalConfig.token,
  getDeveloperId: () => getDeveloperIdFromSession().then((v) => v || ''),
});
