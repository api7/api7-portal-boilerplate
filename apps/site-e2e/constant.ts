import { k8KeyCloakPort } from './utils/shell';

export const ONETIME_PASSWORD = process.env.ONETIME_PASSWORD || 'admin';
// now we use 3001 as default port for portal e2e testing
// you can check it in devportal.yaml
export const E2E_TARGET_URL =
  process.env.E2E_TARGET_URL || 'http://localhost:3001';
export const HTTPBIN_URL = 'http://localhost:17080';
export const SMTP4DEV_URL = 'http://localhost:8000';
export const KEYCLOAK_URL = `http://localhost:${k8KeyCloakPort}`;
export const KEYCLOAK_K8S_URL = `http://api7ee3-keycloak:${k8KeyCloakPort}`;
export const CLUSTER_NAME = 'api7ee-e2e';

export const PROVIDER_UI_PREFIX = '/portals';
export const PROVIDER_UI_ROOT_PATH = `${PROVIDER_UI_PREFIX}/products`;
