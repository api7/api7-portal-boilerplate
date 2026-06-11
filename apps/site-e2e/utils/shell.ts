import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { A7Ctx } from '../req/dashboard/common';
import {
  GetDockerDeploymentScript,
  a7GetDockerDeploymentScript,
} from '../req/dashboard/gateway';
import { waitForPort } from './helper';

const tinyexecPromise = import('tinyexec').then((m) => m.x);

const ROOT_DIR = process.cwd().replace(/\/apps\/site-e2e$/, '');
const E2E_RUNTIME_DIR = path.join(
  ROOT_DIR,
  'apps/site-e2e/runtime/api7-ee-minimal',
);
const E2E_ENV_FILE = path.join(E2E_RUNTIME_DIR, '.env.example');
const E2E_COMPOSE_FILE = path.join(E2E_RUNTIME_DIR, 'docker-compose.yaml');
const E2E_SUPPORT_COMPOSE_FILE = path.join(
  E2E_RUNTIME_DIR,
  'docker-compose.support.yaml',
);
const E2E_DEVPORTAL_CONFIG_PATH = path.join(
  E2E_RUNTIME_DIR,
  'devportal.e2e.config.yaml',
);
const E2E_GATEWAY_DIR = path.join(E2E_RUNTIME_DIR, 'gateway_conf');
const E2E_GATEWAY_CONFIG = path.join(E2E_GATEWAY_DIR, 'config.yaml');
const E2E_GATEWAY_UID = path.join(E2E_GATEWAY_DIR, 'apisix.uid');
const E2E_FE_CONTAINER = 'developer-portal-e2e';
const E2E_FE_IMAGE =
  process.env.E2E_FE_IMAGE || 'api7-ee-developer-portal-e2e:dev';
const E2E_GATEWAY_NAME = 'api7-ee-gateway-1';
const E2E_NETWORK = 'api7-ee_api7';
const E2E_GATEWAY_HTTP_PORT = 9080;
const E2E_GATEWAY_HTTPS_PORT = 9443;

type ExcludeFirst<T extends any[]> = T extends [any, ...infer Rest]
  ? Rest
  : never;
type XArgs = ExcludeFirst<Parameters<Awaited<typeof tinyexecPromise>>>;

const xParams = [[], { nodeOptions: { shell: true } }] as XArgs;
const shellQuote = (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`;
const SAFE_TOKEN = /^[a-zA-Z0-9._/-]+$/;

const assertSafeToken = (field: string, value: string) => {
  if (!SAFE_TOKEN.test(value)) {
    throw new Error(`Unsafe ${field}: ${value}`);
  }
  return value;
};

const minimalComposeCmd = [
  'docker compose',
  `--env-file ${shellQuote(E2E_ENV_FILE)}`,
  `-f ${shellQuote(E2E_COMPOSE_FILE)}`,
].join(' ');

const supportComposeCmd = [
  'docker compose',
  `-f ${shellQuote(E2E_SUPPORT_COMPOSE_FILE)}`,
].join(' ');

export const x = async (cmd: string, ...args: XArgs) => {
  const baseX = await tinyexecPromise;
  return baseX(cmd, ...([...xParams, ...args] as XArgs));
};

export const DEFAULT_NAMESPACE = 'api7';

const runChecked = async (cmd: string, errorMessage: string) => {
  const result = await x(cmd);
  if (result.exitCode !== 0) {
    throw new Error(
      `${errorMessage}: ${String(result.stderr ?? result.stdout ?? '').trim()}`,
    );
  }

  return result;
};

const ensureGatewayRuntimeFiles = () => {
  fs.mkdirSync(E2E_GATEWAY_DIR, { recursive: true });

  if (!fs.existsSync(E2E_GATEWAY_CONFIG)) {
    fs.writeFileSync(
      E2E_GATEWAY_CONFIG,
      'nginx_config:\n  error_log_level: warn\n  worker_processes: 1\n',
    );
  }

  if (!fs.existsSync(E2E_GATEWAY_UID)) {
    fs.writeFileSync(E2E_GATEWAY_UID, `${randomUUID().toLowerCase()}\n`);
  }
};

export const ensureMinimalPlatform = async () => {
  if (!process.env.SKIP_PLATFORM_SETUP) {
    await runChecked(
      `${minimalComposeCmd} up -d`,
      'Failed to start API7 EE runtime',
    );
  }
  await waitForPort(7443, 120000, '127.0.0.1');
  await waitForPort(4321, 120000, '127.0.0.1');
};

export const ensureSupportServices = async () => {
  await runChecked(
    `${supportComposeCmd} up -d`,
    'Failed to start E2E support services',
  );

  await waitForPort(8080, 120000);
  await waitForPort(8000, 120000);
  await waitForPort(17080, 120000);
};

export const buildDevPortalImage = async () => {
  await runChecked(
    `cd ${shellQuote(ROOT_DIR)} && docker build -f Dockerfile --build-arg NEXT_PUBLIC_TESTING=true -t ${shellQuote(E2E_FE_IMAGE)} .`,
    'Failed to build E2E developer portal image',
  );
};

export const execPostgres = async (sql: string) => {
  return await x(
    `${minimalComposeCmd} exec -T postgresql env PGPASSWORD=changeme psql -v ON_ERROR_STOP=1 -U api7ee -d postgres -c ${shellQuote(sql)}`,
  );
};

export const getDevPortalLogs = async (tail = 100) => {
  return await x(`docker logs --tail=${tail} ${E2E_FE_CONTAINER}`);
};

export const waitContainerReady = async (
  _label: string,
  _ns = DEFAULT_NAMESPACE,
  timeout = 300,
) => {
  await waitForPort(3001, timeout * 1000);
};

export const waitForGatewayPort = async (
  _label: string,
  portForward: `${string}:${string}`,
) => {
  const [localPort] = portForward.split(':');
  await waitForPort(parseInt(localPort, 10), 30000);
};

const startDevPortalContainer = async () => {
  if (!fs.existsSync(E2E_DEVPORTAL_CONFIG_PATH)) {
    throw new Error(
      `Missing E2E developer portal config: ${E2E_DEVPORTAL_CONFIG_PATH}`,
    );
  }

  await x(`docker rm -f ${E2E_FE_CONTAINER} || true`);
  await runChecked(
    [
      'docker run -d',
      `--name ${E2E_FE_CONTAINER}`,
      `--network ${E2E_NETWORK}`,
      '-p 127.0.0.1:3001:3001',
      `-v ${shellQuote(E2E_DEVPORTAL_CONFIG_PATH)}:/app/apps/site/config.yaml:ro`,
      shellQuote(E2E_FE_IMAGE),
    ].join(' '),
    'Failed to start E2E developer portal container',
  );
};

export const restartDevPortal = async (
  _deploymentName = 'developer-portal',
  _serviceName = 'developer-portal',
  _portForward: `${string}:${string}` = '3001:3001',
  _ns = DEFAULT_NAMESPACE,
) => {
  await startDevPortalContainer();
  await waitForPort(3001, 120000);
  await new Promise((resolve) => setTimeout(resolve, 5000));
};

export const KEYCLOAK_PORT = 8080;
export const deployKeycloakContainer = async (port = KEYCLOAK_PORT) => {
  await runChecked(
    `${supportComposeCmd} up -d keycloak`,
    'Failed to start Keycloak',
  );
  await waitForPort(port, 120000);
};

export const fixturesPath = './apps/site-e2e/fixtures';
export const removeKeycloakContainer = async () => {
  await x('docker rm -f api7ee3-keycloak || true').then((out) => {
    console.log('delete keycloak Result', JSON.stringify(out));
  });
};

export const deployGatewayContainer = async (
  ctx: A7Ctx,
  data: Omit<GetDockerDeploymentScript, 'image'>,
) => {
  const name = assertSafeToken('gateway name', data.name || E2E_GATEWAY_NAME);
  const registry = assertSafeToken(
    'registry',
    process.env.API7_REGISTRY || process.env.REGISTRY || 'docker.io',
  );
  const registryNamespace = assertSafeToken(
    'registry namespace',
    process.env.API7_REGISTRY_NAMESPACE || process.env.REGISTRY_NS || 'api7',
  );
  const gatewayTag = (
    process.env.API7_GATEWAY_TAG ||
    process.env.API7_EE_TAG ||
    'v3.9.13'
  ).replace(/^v/, '');
  const safeGatewayTag = assertSafeToken('gateway tag', gatewayTag);

  ensureGatewayRuntimeFiles();
  await x(`docker rm -f ${shellQuote(name)} || true`);

  const script = await a7GetDockerDeploymentScript(ctx, {
    ...data,
    image: `${registry}/${registryNamespace}/api7-ee-3-gateway:${safeGatewayTag}`,
    name,
    http_port: E2E_GATEWAY_HTTP_PORT,
    https_port: E2E_GATEWAY_HTTPS_PORT,
    dp_manager_address: 'https://dp-manager:7943',
    extra_args: [
      `--network=${E2E_NETWORK}`,
      `-v ${E2E_GATEWAY_CONFIG}:/usr/local/apisix/conf/config.yaml`,
      `-v ${E2E_GATEWAY_UID}:/usr/local/apisix/conf/apisix.uid`,
    ],
  });

  const deployCmd = `cd ${shellQuote(ROOT_DIR)} && timeout 15s ${script}`;
  const { stdout, stderr, exitCode } = await x(deployCmd);
  if (exitCode === 124) {
    const logs = await x(`docker logs --tail=200 ${shellQuote(name)} || true`);
    const ps = await x(
      `docker ps -a --filter name=${shellQuote(name)} || true`,
    );
    throw new Error(
      [
        'Gateway deployment timed out after 15s',
        `stderr: ${String(stderr ?? '').trim()}`,
        `ps:\n${String(ps.stdout ?? '').trim()}`,
        `logs:\n${String(logs.stdout ?? logs.stderr ?? '').trim()}`,
      ].join('\n\n'),
    );
  }
  if (exitCode !== 0) {
    const logs = await x(`docker logs --tail=200 ${shellQuote(name)} || true`);
    const ps = await x(
      `docker ps -a --filter name=${shellQuote(name)} || true`,
    );
    throw new Error(
      [
        'Gateway deployment command failed',
        `stderr: ${String(stderr ?? '').trim()}`,
        `ps:\n${String(ps.stdout ?? '').trim()}`,
        `logs:\n${String(logs.stdout ?? logs.stderr ?? '').trim()}`,
      ].join('\n\n'),
    );
  }
  console.log('deploy gateway instance', {
    containerName: name,
    exitCode,
    status: exitCode === 0 ? 'success' : 'failure',
    shortSummary: String(stdout ?? '')
      .trim()
      .slice(0, 120),
  });
  try {
    await waitForPort(E2E_GATEWAY_HTTP_PORT, 15000);
  } catch (err) {
    const logs = await x(`docker logs --tail=200 ${shellQuote(name)} || true`);
    const ps = await x(
      `docker ps -a --filter name=${shellQuote(name)} || true`,
    );
    throw new Error(
      [
        `Gateway port ${E2E_GATEWAY_HTTP_PORT} not ready within 15s`,
        `cause: ${String(err)}`,
        `ps:\n${String(ps.stdout ?? '').trim()}`,
        `logs:\n${String(logs.stdout ?? logs.stderr ?? '').trim()}`,
      ].join('\n\n'),
    );
  }
};

/** default uninstall the gateway */
export const removeGatewayContainer = async (
  data: Pick<GetDockerDeploymentScript, 'name'> = {},
) => {
  const { name = E2E_GATEWAY_NAME } = data;
  await x(`docker rm -f ${shellQuote(name)} || true`).then((out) => {
    console.log('Gateway uninstall Result', JSON.stringify(out));
  });
};
