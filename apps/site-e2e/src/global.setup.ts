import { request, test as setup } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';

import { E2E_TARGET_URL } from '../constant';
import { API_PORTALS, API_PORTAL_TOKEN } from '../req/dashboard/constant';
import { initializeE2EConfig } from '../utils/devportal-config';
import {
  buildDevPortalImage,
  ensureMinimalPlatform,
  ensureSupportServices,
  execPostgres,
  getDevPortalLogs,
  restartDevPortal,
  x,
} from '../utils/shell';

const E2E_FE_DB_NAME = 'devportal_fe_e2e';

const ensureEnv = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
};

const shellQuote = (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`;

async function resetFeDatabase() {
  console.log(`Resetting FE E2E database: ${E2E_FE_DB_NAME}`);

  const sqlCommands = [
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${E2E_FE_DB_NAME}' AND pid <> pg_backend_pid();`,
    `DROP DATABASE IF EXISTS \"${E2E_FE_DB_NAME}\";`,
    `CREATE DATABASE \"${E2E_FE_DB_NAME}\" OWNER \"api7ee\";`,
  ];

  for (const sql of sqlCommands) {
    const result = await execPostgres(sql);
    if (result.exitCode !== 0) {
      const stderr = String(result.stderr ?? '');
      const stdout = String(result.stdout ?? '');
      throw new Error(
        `Failed to recreate ${E2E_FE_DB_NAME}: ${`${stderr}\n${stdout}`.trim()}`,
      );
    }
  }

  console.log(`FE E2E database ready: ${E2E_FE_DB_NAME}`);
}

setup('deploy developer portal', async ({}) => {
  setup.setTimeout(600_000);
  const A7_ROOT_USERNAME = ensureEnv(
    process.env.A7_ROOT_USERNAME,
    'A7_ROOT_USERNAME',
  );
  const A7_ROOT_PASSWORD = ensureEnv(
    process.env.A7_ROOT_PASSWORD,
    'A7_ROOT_PASSWORD',
  );
  const A7_URL = ensureEnv(process.env.A7_URL, 'A7_URL');
  const ONETIME_PASSWORD = ensureEnv(
    process.env.ONETIME_PASSWORD,
    'ONETIME_PASSWORD',
  );
  const { BACKEND_API7_LICENSE } = process.env;
  let licenseActivationError: string | null = null;

  console.log('Global Setup: Starting...');
  await ensureMinimalPlatform();
  await ensureSupportServices();
  console.log('Connecting to Dashboard...');

  // Create base context
  const ctx = await request.newContext({
    baseURL: A7_URL,
    ignoreHTTPSErrors: true,
  });

  // Try to login with the set password
  const adminLogin = { username: A7_ROOT_USERNAME, password: A7_ROOT_PASSWORD };
  const loginRes = await ctx.post('/api/login', {
    data: adminLogin,
    failOnStatusCode: false,
  });

  if (loginRes.status() !== 200) {
    // Login with ONETIME_PASSWORD and change password
    console.log('First time login, changing password...');

    const tmpCtx = await request.newContext({
      baseURL: A7_URL,
      ignoreHTTPSErrors: true,
      httpCredentials: {
        username: A7_ROOT_USERNAME,
        password: ONETIME_PASSWORD,
        send: 'always',
      },
    });

    const pwdRes = await tmpCtx.put('/api/password', {
      data: { new_password: A7_ROOT_PASSWORD },
      failOnStatusCode: false,
    });

    if (pwdRes.status() === 200) {
      console.log('Password changed');
    } else {
      const pwdBody = await pwdRes.text();
      console.log('Password change response:', pwdRes.status(), pwdBody);
    }

    await tmpCtx.dispose();

    // Login with the new password
    const loginRes = await ctx.post('/api/login', {
      data: adminLogin,
      failOnStatusCode: false,
    });

    if (loginRes.status() !== 200) {
      const loginBody = await loginRes.text();
      throw new Error(
        `Failed to login after password change: ${loginRes.status()} ${loginBody}`,
      );
    }
  }

  console.log('Logged in to Dashboard');

  // Activate License
  if (BACKEND_API7_LICENSE) {
    console.log('Activating license...');
    const licenseRes = await ctx.get('/api/license', {
      failOnStatusCode: false,
    });
    if (licenseRes.status() !== 200) {
      const activateRes = await ctx.put('/api/license', {
        data: { data: BACKEND_API7_LICENSE },
        failOnStatusCode: false,
      });
      if (activateRes.status() === 200) {
        console.log('License activated');
      } else {
        licenseActivationError = `${activateRes.status()} ${await activateRes.text()}`;
        console.log(
          'License activation failed:',
          activateRes.status(),
          licenseActivationError,
        );
      }
    } else {
      console.log('License already active');
    }
  } else {
    console.log('BACKEND_API7_LICENSE not set, skipping license activation');
  }

  // Create/Get Portal
  console.log('Getting or creating Portal...');
  const portalsRes = await ctx.get(`${API_PORTALS}?search=default`, {
    failOnStatusCode: false,
  });
  const portalsData = await portalsRes.json();
  let portalId = portalsData.list?.[0]?.id;

  if (!portalId) {
    if (licenseActivationError) {
      throw new Error(
        `Cannot create portal because license is not active. License activation failed earlier: ${licenseActivationError}`,
      );
    }

    console.log('Creating new portal...');
    const createRes = await ctx.post(API_PORTALS, {
      data: {
        name: 'default',
        public_url: E2E_TARGET_URL,
        labels: { env: 'e2e' },
      },
      failOnStatusCode: false,
    });
    const createData = await createRes.json();
    portalId = createData.value?.id;
    if (!portalId) {
      throw new Error(
        `Failed to create portal: status=${createRes.status()} body=${JSON.stringify(createData)}`,
      );
    }
    console.log('Portal created:', portalId);
  } else {
    console.log('Portal found:', portalId);
  }

  // Get Portal Token
  console.log('Getting Portal Token...');

  // Create new token (use unique name each time)
  const tokenName = `e2e-token-${Date.now()}`;
  const tokenRes = await ctx.post(`${API_PORTAL_TOKEN}?portal_id=${portalId}`, {
    data: {
      name: tokenName,
      expires_at: 0,
    },
    failOnStatusCode: false,
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.value?.token;

  if (!token) {
    console.log('Token creation response:', JSON.stringify(tokenData));
    throw new Error('Failed to get Portal Token');
  }

  console.log('Portal Token obtained');

  await ctx.dispose();

  await resetFeDatabase();

  // Deploy new Developer Portal
  await deployAndVerify(token);
});

async function deployAndVerify(token: string) {
  console.log('Deploying new Developer Portal...');
  initializeE2EConfig(token);
  await buildDevPortalImage();
  await restartDevPortal();

  // Dump initial logs for diagnosis
  try {
    const { stdout: logs } = await getDevPortalLogs(50);
    console.log('Initial container logs:\n', logs);
  } catch {
    console.log('Could not fetch initial container logs');
  }

  // Wait for service to be ready with retries (Next.js needs time to compile & start)
  // Use 127.0.0.1 instead of localhost to avoid IPv6 resolution issues on some CI runners.
  console.log('Waiting for service to be ready...');
  const verifyUrl = 'http://127.0.0.1:3001';
  const maxWaitMs = 120_000;
  const pollIntervalMs = 5_000;
  const deadline = Date.now() + maxWaitMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      await verifyDeployment(verifyUrl);
      console.log('Global Setup: Complete!');
      return;
    } catch (err) {
      lastError = err;
      const elapsed = maxWaitMs - (deadline - Date.now());
      console.log(
        `Deployment not ready yet (${Math.round(elapsed / 1000)}s elapsed), retrying...`,
      );
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  // Dump final logs for diagnosis before throwing
  try {
    const { stdout: finalLogs } = await getDevPortalLogs(100);
    console.log('Final container logs:\n', finalLogs);
  } catch {
    console.log('Could not fetch final container logs');
  }

  throw new Error(
    `Developer Portal failed to become ready within ${maxWaitMs / 1000}s: ${lastError}`,
  );
}

async function verifyDeployment(baseUrl: string) {
  console.log('Verifying deployment...');

  const portalCtx = await request.newContext({
    baseURL: baseUrl,
  });

  try {
    // Verify can get products
    const productsRes = await portalCtx.get('/api/api_products', {
      failOnStatusCode: false,
    });
    if (productsRes.status() !== 200) {
      const body = await productsRes.text();
      throw new Error(
        `Failed to get products from new Developer Portal: ${productsRes.status()} ${body}`,
      );
    }
    console.log('Products API working');

    // Verify can create user
    const testEmail = `setup-test-${Date.now()}@example.com`;
    const signupRes = await portalCtx.post(`${AUTH_BASE_PATH}/sign-up/email`, {
      data: {
        email: testEmail,
        password: 'Test123456',
        name: 'Setup Test User',
      },
      failOnStatusCode: false,
    });
    if (signupRes.status() !== 200) {
      const body = await signupRes.text();
      throw new Error(
        `Failed to create user on new Developer Portal: ${signupRes.status()} ${body}`,
      );
    }
    console.log('User signup working');
  } finally {
    await portalCtx.dispose();
  }
}
