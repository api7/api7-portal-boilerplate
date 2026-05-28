import { k8KeyCloakPort } from './utils/shell';

export const ONETIME_PASSWORD = process.env.ONETIME_PASSWORD || 'admin';
// Portal E2E uses port 3001 by default.
// The FE-under-test container publishes this port directly on the host.
export const E2E_TARGET_URL =
  process.env.E2E_TARGET_URL || 'http://127.0.0.1:3001';
export const HTTPBIN_URL = 'http://localhost:17080';
export const SMTP4DEV_URL = 'http://localhost:8000';
export const KEYCLOAK_URL = `http://localhost:${k8KeyCloakPort}`;
export const KEYCLOAK_K8S_URL = `http://api7ee3-keycloak:${k8KeyCloakPort}`;
export const CLUSTER_NAME = 'api7ee-e2e';

export const PROVIDER_UI_PREFIX = '/portals';
export const PROVIDER_UI_ROOT_PATH = `${PROVIDER_UI_PREFIX}/products`;
