import { type APIRequestContext, expect, test } from '@playwright/test';
import { AUTH_BASE_PATH } from '@site/constants/api-prefix';
import { PATH_LOGIN } from '@site/constants/path-prefix';
import type { ConfigMapData } from '@site/lib/config/schema';

import { KEYCLOAK_CONTAINER_URL, KEYCLOAK_URL } from '../constant';
import { genCtx } from '../req/common';
import {
  getConfigMapYaml,
  patchConfigMapYaml,
  updateConfigMapYaml,
} from '../utils/devportal-config';
import { kcAdmin, newKCAdminClient } from '../utils/keycloak';
import { restartDevPortal } from '../utils/shell';

test.use({ storageState: { cookies: [], origins: [] } });

const OIDC_CLIENT_ID = 'devportal-oidc';
const OIDC_CLIENT_SECRET = 'devportal-oidc-secret';
const PROVIDER_ID = 'keycloak';
const SSO_DOMAIN = 'sso-e2e.example';
const KEYCLOAK_AUTH_URL = new RegExp(
  `^${KEYCLOAK_CONTAINER_URL}/realms/master/protocol/openid-connect/auth`,
);

const adminClient = async () => {
  const client = await newKCAdminClient({
    baseUrl: KEYCLOAK_URL,
    realmName: 'master',
  });
  await client.auth({
    ...kcAdmin,
    grantType: 'password',
    clientId: 'admin-cli',
  });
  return client;
};

const deleteOidcClient = async () => {
  const client = await adminClient();
  const existing = await client.clients.find({ clientId: OIDC_CLIENT_ID });
  await Promise.allSettled(
    (existing ?? []).map((c) => client.clients.del({ id: c.id! })),
  );
};

const createOidcClient = async () => {
  await deleteOidcClient();
  const client = await adminClient();
  await client.clients.create({
    clientId: OIDC_CLIENT_ID,
    secret: OIDC_CLIENT_SECRET,
    enabled: true,
    protocol: 'openid-connect',
    publicClient: false,
    standardFlowEnabled: true,
    redirectUris: ['*'],
    webOrigins: ['*'],
  });
};

const createAccount = (prefix: string, domain = 'test.example.com') => {
  const id = `${prefix}-${Date.now()}`;
  return {
    email: `${id}@${domain}`,
    password: `Password3412.${id}`,
    name: id,
  };
};

const post = (ctx: APIRequestContext, path: string, data: object) =>
  ctx.post(`${AUTH_BASE_PATH}${path}`, { data, failOnStatusCode: false });

const signUp = async (account: ReturnType<typeof createAccount>) => {
  const ctx = await genCtx();
  try {
    const res = await post(ctx, '/sign-up/email', account);
    expect(res.status()).toBe(200);
  } finally {
    await ctx.dispose();
  }
};

const withConfig = (
  mutate: (config: ConfigMapData) => void,
  testing = true,
) => {
  let defaultConfig: string | null = null;

  test.beforeAll(async () => {
    defaultConfig = await getConfigMapYaml();
    await patchConfigMapYaml<ConfigMapData>(mutate);
    await restartDevPortal(testing);
  });

  test.afterAll(async () => {
    if (defaultConfig) {
      await updateConfigMapYaml(defaultConfig);
      await restartDevPortal();
    }
  });
};

test.describe.serial('SSO domain policy', () => {
  test.setTimeout(600_000);

  const ssoAccount = createAccount('sso-existing', SSO_DOMAIN);
  const otherAccount = createAccount('sso-other');

  test.beforeAll(async () => {
    await createOidcClient();
    // Registered before the policy applies, so the server is what has to refuse them.
    await signUp(ssoAccount);
    await signUp(otherAccount);
  });

  test.afterAll(deleteOidcClient);

  withConfig((config) => {
    config.auth.sso = {
      providers: [
        {
          providerId: PROVIDER_ID,
          domains: [`@${SSO_DOMAIN.replace('.', '\\.')}$`],
        },
      ],
    };
    config.auth.genericOAuthProviders = config.auth.genericOAuthProviders.map(
      (provider) =>
        provider.providerId === PROVIDER_ID
          ? { ...provider, ssoOnly: true }
          : provider,
    );
  });

  test('an email on an SSO domain is offered only its SSO provider', async ({
    page,
  }) => {
    const email = `Someone-${Date.now()}@SSO-E2E.example`;
    await page.goto(PATH_LOGIN);
    await page.waitForLoadState('networkidle');

    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    const ssoButton = page.getByRole('button', {
      name: 'Continue with Keycloak',
    });
    await expect(ssoButton).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password' })).toHaveCount(
      0,
    );

    await ssoButton.click();
    await expect(page).toHaveURL(KEYCLOAK_AUTH_URL);
    expect(new URL(page.url()).searchParams.get('login_hint')).toBe(email);
  });

  test('the server refuses local sign-in methods for an SSO domain', async () => {
    const ctx = await genCtx();
    const attempts = [
      post(ctx, '/sign-in/email', {
        email: ssoAccount.email,
        password: ssoAccount.password,
      }),
      post(ctx, '/sign-in/email', {
        email: ssoAccount.email.toUpperCase(),
        password: ssoAccount.password,
      }),
      post(ctx, '/sign-up/email', createAccount('sso-new', SSO_DOMAIN)),
      post(ctx, '/request-password-reset', { email: ssoAccount.email }),
      post(ctx, '/sign-in/magic-link', { email: ssoAccount.email }),
    ];

    for (const res of await Promise.all(attempts)) {
      expect(res.status()).toBe(403);
      expect((await res.json()).code).toBe('SSO_REQUIRED_FOR_EMAIL_DOMAIN');
    }
    await ctx.dispose();
  });

  test('other domains keep password sign-in and do not see the SSO-only provider', async ({
    page,
  }) => {
    await page.goto(PATH_LOGIN);
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('button', { name: 'Continue with Keycloak' }),
    ).toHaveCount(0);

    await page.getByRole('textbox', { name: 'Email' }).fill(otherAccount.email);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'Password' })
      .fill(otherAccount.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
  });
});

test.describe.serial('Email and password disabled', () => {
  test.setTimeout(600_000);

  const account = createAccount('emailpw-disabled');

  test.beforeAll(async () => {
    await createOidcClient();
    await signUp(account);
  });

  test.afterAll(deleteOidcClient);

  withConfig((config) => {
    config.auth.emailAndPassword.enabled = false;
    config.auth.sso = { providers: [] };
  });

  test('password UI is hidden and non-SSO emails can use magic link', async ({
    page,
  }) => {
    await page.goto(PATH_LOGIN);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Forgot password?')).toBeHidden();
    await expect(page.getByRole('link', { name: 'Sign Up' })).toBeHidden();

    await page.getByLabel('Email').fill('someone@other.example.com');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByText('Send Magic Link')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeHidden();
    await expect(page.getByText('Forgot password?')).toBeHidden();
  });

  for (const path of [
    'sign-up',
    'forgot-password',
    'reset-password',
    'reset-link-sent',
  ]) {
    test(`${path} redirects to sign-in with the original destination`, async ({
      page,
    }) => {
      const redirectTo =
        '/organization/accept-invitation?invitationId=example#accept';
      await page.goto(
        `/auth/${path}?redirectTo=${encodeURIComponent(redirectTo)}`,
      );
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === PATH_LOGIN &&
          url.searchParams.get('redirectTo') === redirectTo,
      );
    });
  }

  test('password sign-in and sign-up are refused while SSO stays available', async ({
    page,
  }) => {
    const ctx = await genCtx();
    const signIn = await post(ctx, '/sign-in/email', {
      email: account.email,
      password: account.password,
    });
    expect(signIn.status()).toBe(400);
    expect((await signIn.json()).code).toBe('EMAIL_PASSWORD_DISABLED');

    const signUpRes = await post(
      ctx,
      '/sign-up/email',
      createAccount('emailpw-disabled-new'),
    );
    expect(signUpRes.status()).toBe(400);
    expect((await signUpRes.json()).code).toBe(
      'EMAIL_PASSWORD_SIGN_UP_DISABLED',
    );
    await ctx.dispose();

    await page.goto(PATH_LOGIN);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Continue with Keycloak' }).click();
    await expect(page).toHaveURL(KEYCLOAK_AUTH_URL);
  });
});

test.describe.serial('SSO-only sign-in without magic link', () => {
  test.setTimeout(600_000);

  test.beforeAll(createOidcClient);

  test.afterAll(deleteOidcClient);

  withConfig((config) => {
    config.auth.emailAndPassword.enabled = false;
    config.auth.sso = { providers: [] };
  }, false);

  test('only the SSO button is shown without domain routing', async ({
    page,
  }) => {
    await page.goto(PATH_LOGIN);
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('Email')).toBeHidden();
    await expect(page.getByLabel('Password')).toBeHidden();
    await expect(page.getByText('Send Magic Link')).toBeHidden();
    await expect(page.getByText('Forgot password?')).toBeHidden();
    await expect(page.getByRole('link', { name: 'Sign Up' })).toBeHidden();
    await page.getByRole('button', { name: 'Continue with Keycloak' }).click();
    await expect(page).toHaveURL(KEYCLOAK_AUTH_URL);
  });

  test('empty domain rules do not expose an unusable email step', async ({
    page,
  }) => {
    await patchConfigMapYaml<ConfigMapData>((config) => {
      config.auth.sso = {
        providers: [{ providerId: PROVIDER_ID, domains: [] }],
      };
    });
    await restartDevPortal(false);

    await page.goto(PATH_LOGIN);
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('Email')).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Continue with Keycloak' }),
    ).toBeVisible();
  });

  test('domain routing rejects unmatched emails and discovers an SSO-only provider', async ({
    page,
  }) => {
    await patchConfigMapYaml<ConfigMapData>((config) => {
      config.auth.sso = {
        providers: [
          {
            providerId: PROVIDER_ID,
            domains: [`@${SSO_DOMAIN.replace('.', '\\.')}$`],
          },
        ],
      };
      config.auth.genericOAuthProviders = config.auth.genericOAuthProviders.map(
        (provider) =>
          provider.providerId === PROVIDER_ID
            ? { ...provider, ssoOnly: true }
            : provider,
      );
    });
    await restartDevPortal(false);

    await page.goto(PATH_LOGIN);
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('button', { name: 'Continue with Keycloak' }),
    ).toBeHidden();
    await page.getByLabel('Email').fill('someone@other.example.com');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(
      page.getByText(
        'Single sign-on is not configured for this email address.',
      ),
    ).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeHidden();
    await expect(page.getByText('Send Magic Link')).toBeHidden();

    const email = `someone@${SSO_DOMAIN}`;
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password')).toBeHidden();
    await expect(page.getByText('Send Magic Link')).toBeHidden();
    await page.getByRole('button', { name: 'Continue with Keycloak' }).click();
    await expect(page).toHaveURL(KEYCLOAK_AUTH_URL);
    expect(new URL(page.url()).searchParams.get('login_hint')).toBe(email);
  });
});

test.describe.serial('Social provider', () => {
  test.setTimeout(600_000);

  const GITHUB_CLIENT_ID = 'e2e-github-client';

  withConfig((config) => {
    config.auth.socialProviders = {
      github: { clientId: GITHUB_CLIENT_ID, clientSecret: 'e2e-github-secret' },
    };
  });

  test('sign-in hands off to the provider with this portal as the callback', async ({
    page,
    baseURL,
  }) => {
    // Never leave the test environment; only the outgoing authorize URL matters.
    await page.route('https://github.com/**', (route) =>
      route.fulfill({ status: 200, body: 'intercepted' }),
    );

    await page.goto(PATH_LOGIN);
    await page.waitForLoadState('networkidle');
    const authorize = page.waitForRequest((req) =>
      req.url().startsWith('https://github.com/login/oauth/authorize'),
    );
    await page.getByRole('button', { name: 'Continue with GitHub' }).click();

    const url = new URL((await authorize).url());
    expect(url.searchParams.get('client_id')).toBe(GITHUB_CLIENT_ID);
    expect(url.searchParams.get('redirect_uri')).toBe(
      `${baseURL}${AUTH_BASE_PATH}/callback/github`,
    );
    expect(url.searchParams.get('state')).toBeTruthy();
  });
});
