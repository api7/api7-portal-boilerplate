import fs from 'node:fs';
import path from 'node:path';

import { ConfigMapData } from '@site/lib/config/schema';

import { parseYaml, stringifyYaml } from './helper';

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
    },
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

const readCurrentConfig = (): ConfigMapData => {
  ensureRuntimeDir();

  if (!fs.existsSync(E2E_CONFIG_PATH)) {
    const initialConfig = createDefaultConfig();
    fs.writeFileSync(E2E_CONFIG_PATH, `${stringifyYaml(initialConfig)}\n`);
    return initialConfig;
  }

  return parseYaml<ConfigMapData>(fs.readFileSync(E2E_CONFIG_PATH, 'utf8'));
};

const writeConfig = (config: ConfigMapData) => {
  ensureRuntimeDir();
  fs.writeFileSync(E2E_CONFIG_PATH, `${stringifyYaml(config)}\n`);
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

export async function getConfigMapYaml(): Promise<string> {
  return `${stringifyYaml(readCurrentConfig())}\n`;
}

export async function updateConfigMapYaml(configYaml: string): Promise<void> {
  ensureRuntimeDir();
  fs.writeFileSync(
    E2E_CONFIG_PATH,
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
