import { test as setup, request } from '@playwright/test';
import { x } from '../utils/shell';
import { API_PRODUCTS, AUTH_BASE_PATH } from '@site/constants/api-prefix';
import { E2E_TARGET_URL } from '../constant';
import { API_PORTAL_TOKEN, API_PORTALS } from '../req/dashboard/constant';

const ROOT_DIR = process.cwd().replace(/\/apps\/site-e2e$/, '');

setup('deploy developer portal', async ({}) => {
  setup.setTimeout(600_000);
  const {
    A7_ROOT_USERNAME,
    A7_ROOT_PASSWORD,
    A7_URL,
    ONETIME_PASSWORD,
    BACKEND_API7_LICENSE,
  } = process.env;

  console.log('Global Setup: Starting...');
  console.log('Connecting to Dashboard...');

  // Create base context
  const ctx = await request.newContext({ baseURL: A7_URL });

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
        `Failed to login after password change: ${loginRes.status()} ${loginBody}`
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
        console.log(
          'License activation failed:',
          activateRes.status(),
          await activateRes.text()
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
    console.log('Creating new portal...');
    const createRes = await ctx.post(API_PORTALS, {
      data: {
        name: 'default',
        public_url: E2E_TARGET_URL,
        labels: { env: 'e2e' },
      },
    });
    const createData = await createRes.json();
    portalId = createData.value?.id;
    if (!portalId) {
      throw new Error('Failed to create portal: ' + JSON.stringify(createData));
    }
    console.log('Portal created:', portalId);
  } else {
    console.log('Portal found:', portalId);
  }

  // Get Portal Token
  console.log('Getting Portal Token...');

  // Create new token (use unique name each time)
  const tokenName = `e2e-token-${Date.now()}`;
  const tokenRes = await ctx.post(
    `${API_PORTAL_TOKEN}?portal_id=${portalId}`,
    {
      data: {
        name: tokenName,
        expires_at: 0,
      },
      failOnStatusCode: false,
    }
  );
  const tokenData = await tokenRes.json();
  const token = tokenData.value?.token;

  if (!token) {
    console.log('Token creation response:', JSON.stringify(tokenData));
    throw new Error('Failed to get Portal Token');
  }

  console.log('Portal Token obtained');

  await ctx.dispose();

  // Deploy new Developer Portal
  await deployAndVerify(token);
});

async function deployAndVerify(token: string) {
  console.log('Deploying new Developer Portal...');
  console.log(`token: ${token}, ROOT_DIR: ${ROOT_DIR}`);

  await x(
    `make -C $(git rev-parse --show-toplevel) kind-deploy-devportal PORTAL_TOKEN="${token}"`
  ).then((out) => {
    console.log('deployAndVerify Result', JSON.stringify(out));
    if (out.exitCode !== 0) {
      throw new Error(`Failed to deploy developer portal: ${out.stderr}`);
    }
  });

  // 7. Port forward
  console.log('Setting up port forward...');
  await x(
    'make -C $(git rev-parse --show-toplevel) kind-port-forward-devportal'
  ).then((out) => {
    console.log('portForward Result', JSON.stringify(out));
  });

  // Wait for service to be ready
  console.log('Waiting for service to be ready...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Verify deployment success
  await verifyDeployment();

  console.log('Global Setup: Complete!');
}

async function verifyDeployment() {
  console.log('Verifying deployment...');

  const portalCtx = await request.newContext({
    baseURL: E2E_TARGET_URL,
  });

  // Verify can get products
  const productsRes = await portalCtx.get(API_PRODUCTS, {
    failOnStatusCode: false,
  });
  if (productsRes.status() !== 200) {
    const body = await productsRes.text();
    throw new Error(
      `Failed to get products from new Developer Portal: ${productsRes.status()} ${body}`
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
      `Failed to create user on new Developer Portal: ${signupRes.status()} ${body}`
    );
  }
  console.log('User signup working');

  await portalCtx.dispose();
}
