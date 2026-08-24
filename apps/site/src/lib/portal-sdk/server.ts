import '@tanstack/react-start/server-only';

import { API7Portal } from '@api7/portal-sdk';
import axios from 'axios';

import { getConfig } from '@/lib/config';

const portalConfig = getConfig().portal;

/** Bounds how long a stalled Portal API request can hang before failing. */
const PORTAL_REQUEST_TIMEOUT_MS = 30_000;

export const portal = new API7Portal({
  endpoint: portalConfig.url,
  token: portalConfig.token,
  axios: axios.create({ timeout: PORTAL_REQUEST_TIMEOUT_MS }),
});

/** A "developer ID" is an organization ID — scopes Portal API calls to one organization. */
export const getPortalForOrganization = (organizationId: string) =>
  new API7Portal({
    endpoint: portalConfig.url,
    token: portalConfig.token,
    axios: axios.create({ timeout: PORTAL_REQUEST_TIMEOUT_MS }),
    getDeveloperId: async () => organizationId,
  });
