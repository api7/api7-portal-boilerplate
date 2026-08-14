import fs from 'node:fs';
import path from 'node:path';

import { ConfigMapData } from '@site/lib/config/schema';

import { parseYaml, stringifyYaml } from './helper';
import { E2E_SITE_START_CONFIG_PATH, E2E_SITE_START_PORT } from './shell';

const ROOT_DIR = process.cwd().replace(/\/apps\/site-e2e$/, '');
const E2E_RUNTIME_DIR = path.join(
  ROOT_DIR,
  'apps/site-e2e/runtime/api7-ee-minimal',
);
const E2E_CONFIG_PATH = path.join(E2E_RUNTIME_DIR, 'devportal.e2e.config.yaml');
const E2E_FE_DB_NAME = 'devportal_fe_e2e';
const E2E_BASE_URL = 'http://127.0.0.1:3001';
const E2E_PORTAL_URL = 'http://developer-portal:4321';
const E2E_AUTH_SECRET = 'devportal-e2e-secret-devportal-e2e-secret';

// site-start reaches postgresql/the Portal API by container hostname, same as apps/site.
export const E2E_SITE_START_DB_NAME = 'devportal_fe_e2e_start';
export const E2E_SITE_START_BASE_URL = `http://127.0.0.1:${E2E_SITE_START_PORT}`;

const createDefaultConfig = (portalToken = ''): ConfigMapData => ({
  portal: {
    url: E2E_PORTAL_URL,
    token: portalToken,
  },
  db: {
    url: `postgres://api7ee:changeme@postgresql:5432/${E2E_FE_DB_NAME}`,
    pool: {
      max: 20,
      min: 0,
      idleTimeout: 30000,
      connectionTimeout: 2000,
      allowExitOnIdle: false,
    },
    ssl: false,
  },
  auth: {
    secret: E2E_AUTH_SECRET,
    adminUserIds: [],
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    twoFactor: {
      enabled: false,
      required: false,
    },
    genericOAuthProviders: [],
    sso: { providers: [] },
  },
  app: {
    name: 'Developer Portal',
    baseURL: E2E_BASE_URL,
    trustedOrigins: [E2E_BASE_URL],
    applicationDetail: {
      subscriptions: true,
      usage: true,
      credentialsTabs: {
        keyAuth: true,
        basicAuth: true,
        oauth: true,
      },
    },
  },
});

const ensureRuntimeDir = () => {
  fs.mkdirSync(E2E_RUNTIME_DIR, { recursive: true });
};

// Routes config reads/writes to the site-start config file when E2E_FE_TARGET
// says so, else apps/site's — callers still need to restart the container
// afterward for a patched config to take effect.
const isSiteStartTarget = () => process.env.E2E_FE_TARGET === 'site-start';

const activeConfigPath = () =>
  isSiteStartTarget() ? E2E_SITE_START_CONFIG_PATH : E2E_CONFIG_PATH;

const readCurrentConfig = (): ConfigMapData => {
  const configPath = activeConfigPath();

  if (!fs.existsSync(configPath)) {
    if (isSiteStartTarget()) {
      // Missing here means setup ran out of order — don't paper over it with a default.
      throw new Error(
        `site-start config.yaml not found at ${configPath} — initializeE2EConfigForSiteStart() must run before patching config`,
      );
    }
    ensureRuntimeDir();
    const initialConfig = createDefaultConfig();
    fs.writeFileSync(configPath, `${stringifyYaml(initialConfig)}\n`);
    return initialConfig;
  }

  return parseYaml<ConfigMapData>(fs.readFileSync(configPath, 'utf8'));
};

const writeConfig = (config: ConfigMapData) => {
  const configPath = activeConfigPath();
  if (!isSiteStartTarget()) ensureRuntimeDir();
  fs.writeFileSync(configPath, `${stringifyYaml(config)}\n`);
};

export function initializeE2EConfig(portalToken: string): void {
  const config = readCurrentConfig();
  config.portal = {
    ...config.portal,
    url: E2E_PORTAL_URL,
    token: portalToken,
  };
  config.db = {
    ...config.db,
    url: `postgres://api7ee:changeme@postgresql:5432/${E2E_FE_DB_NAME}`,
  };
  config.auth = {
    ...config.auth,
    secret: config.auth.secret || E2E_AUTH_SECRET,
  };
  config.app = {
    ...config.app,
    baseURL: E2E_BASE_URL,
    trustedOrigins: [E2E_BASE_URL],
  };
  writeConfig(config);
}

export function initializeE2EConfigForSiteStart(portalToken: string): void {
  const config = createDefaultConfig(portalToken);
  config.db = {
    ...config.db,
    url: `postgres://api7ee:changeme@postgresql:5432/${E2E_SITE_START_DB_NAME}`,
  };
  config.app = {
    ...config.app,
    baseURL: E2E_SITE_START_BASE_URL,
    trustedOrigins: [E2E_SITE_START_BASE_URL],
  };
  fs.mkdirSync(path.dirname(E2E_SITE_START_CONFIG_PATH), { recursive: true });
  fs.writeFileSync(
    E2E_SITE_START_CONFIG_PATH,
    `${stringifyYaml(config)}\n`,
  );
}

export async function getConfigMapYaml(): Promise<string> {
  return `${stringifyYaml(readCurrentConfig())}\n`;
}

// The token the devportal server itself uses to call the Portal API.
export function getPortalToken(): string {
  const token = readCurrentConfig().portal.token;
  if (!token) {
    throw new Error('portal.token missing from the active devportal config.yaml');
  }
  return token;
}

export async function updateConfigMapYaml(configYaml: string): Promise<void> {
  const configPath = activeConfigPath();
  if (!isSiteStartTarget()) ensureRuntimeDir();
  fs.writeFileSync(
    configPath,
    configYaml.endsWith('\n') ? configYaml : `${configYaml}\n`,
  );
}

export async function patchConfigMapYaml<T extends object = ConfigMapData>(
  mutator: (config: T) => void | Promise<void>,
): Promise<void> {
  try {
    const configObj = parseYaml<T>(await getConfigMapYaml());
    await mutator(configObj);

    await updateConfigMapYaml(stringifyYaml(configObj));
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    throw new Error(
      `Failed to patch E2E config file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
