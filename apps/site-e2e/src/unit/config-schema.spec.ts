import { expect, test } from '@playwright/test';
import { configSchema } from '@site/lib/config/schema';

const minimalConfig = () => ({
  portal: { url: 'http://portal:4321', token: 'a7prt-token' },
  db: { url: 'postgres://u:p@db:5432/portal' },
  auth: { secret: 'x'.repeat(32) },
});

const issuePaths = (input: unknown) => {
  const result = configSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join('.'));
};

test.describe('config schema: required fields', () => {
  test('accepts a minimal config', () => {
    expect(configSchema.safeParse(minimalConfig()).success).toBe(true);
  });

  test('rejects an empty portal url, portal token and db url', () => {
    const config = minimalConfig();
    config.portal = { url: '', token: '' };
    config.db = { url: '' };

    expect(issuePaths(config)).toEqual(
      expect.arrayContaining(['portal.url', 'portal.token', 'db.url']),
    );
  });

  test('rejects an auth secret shorter than 32 characters', () => {
    const config = minimalConfig();
    config.auth.secret = 'x'.repeat(31);

    expect(issuePaths(config)).toEqual(['auth.secret']);
  });
});

test.describe('config schema: defaults', () => {
  test('fills auth defaults', () => {
    const { auth } = configSchema.parse(minimalConfig());

    expect(auth.adminUserIds).toEqual([]);
    expect(auth.session).toEqual({ expiresIn: 604800, updateAge: 86400 });
    expect(auth.emailAndPassword).toEqual({
      enabled: true,
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
    });
    expect(auth.twoFactor).toEqual({ enabled: false, required: false });
    expect(auth.genericOAuthProviders).toEqual([]);
    expect(auth.sso).toEqual({ providers: [] });
  });

  test('defaults revokeSessionsOnPasswordReset when emailAndPassword is set without it', () => {
    const config = {
      ...minimalConfig(),
      auth: {
        ...minimalConfig().auth,
        emailAndPassword: { enabled: true, requireEmailVerification: true },
      },
    };

    expect(
      configSchema.parse(config).auth.emailAndPassword
        .revokeSessionsOnPasswordReset,
    ).toBe(true);
  });

  test('fills app defaults, with every feature switch on', () => {
    const { app } = configSchema.parse(minimalConfig());

    expect(app.name).toBe('Developer Portal');
    expect(app.apiHub).toEqual({ enabled: true });
    expect(app.applicationDetail).toEqual({
      subscriptions: true,
      usage: true,
      credentialsTabs: { keyAuth: true, basicAuth: true, oauth: true },
    });
  });

  test('keeps unset credential tabs on when only one is turned off', () => {
    const config = {
      ...minimalConfig(),
      app: { applicationDetail: { credentialsTabs: { oauth: false } } },
    };

    expect(configSchema.parse(config).app.applicationDetail).toEqual({
      subscriptions: true,
      usage: true,
      credentialsTabs: { keyAuth: true, basicAuth: true, oauth: false },
    });
  });

  test('fills generic OAuth provider defaults', () => {
    const config = {
      ...minimalConfig(),
      auth: {
        ...minimalConfig().auth,
        genericOAuthProviders: [
          {
            providerId: 'keycloak',
            discoveryUrl:
              'http://keycloak:8080/realms/master/.well-known/openid-configuration',
            clientId: 'portal',
            clientSecret: 'secret',
          },
        ],
      },
    };

    expect(configSchema.parse(config).auth.genericOAuthProviders[0]).toEqual(
      expect.objectContaining({
        scopes: ['openid', 'profile', 'email'],
        pkce: true,
        requireIssuerValidation: true,
        ssoOnly: false,
      }),
    );
  });
});

test.describe('config schema: two-factor', () => {
  test('rejects required two-factor when two-factor is disabled', () => {
    const config = {
      ...minimalConfig(),
      auth: {
        ...minimalConfig().auth,
        twoFactor: { enabled: false, required: true },
      },
    };

    expect(issuePaths(config)).toEqual(['auth.twoFactor.required']);
  });

  test('accepts required two-factor when two-factor is enabled', () => {
    const config = {
      ...minimalConfig(),
      auth: {
        ...minimalConfig().auth,
        twoFactor: { enabled: true, required: true },
      },
    };

    expect(configSchema.safeParse(config).success).toBe(true);
  });
});

test.describe('config schema: SSO domain patterns', () => {
  const withDomains = (domains: string[]) => ({
    ...minimalConfig(),
    auth: {
      ...minimalConfig().auth,
      sso: { providers: [{ providerId: 'corp', domains }] },
    },
  });

  test('accepts a valid, safe pattern', () => {
    expect(
      configSchema.safeParse(withDomains(['@example\\.com$'])).success,
    ).toBe(true);
  });

  for (const [name, pattern] of [
    ['an empty pattern', ''],
    ['a whitespace-only pattern', '   '],
    ['an invalid regular expression', '@example(\\.com$'],
    ['a pattern open to catastrophic backtracking', '(a+)+$'],
    ['a pattern longer than 200 characters', `@${'a'.repeat(200)}`],
  ] as const) {
    test(`rejects ${name}`, () => {
      expect(issuePaths(withDomains([pattern]))).toEqual([
        'auth.sso.providers.0.domains.0',
      ]);
    });
  }

  test('rejects unknown keys on an SSO provider', () => {
    const config = withDomains(['@example\\.com$']);
    Object.assign(config.auth.sso.providers[0], { issuer: 'x' });

    expect(issuePaths(config)).toEqual(['auth.sso.providers.0']);
  });
});

test.describe('config schema: db', () => {
  const withDb = (db: Record<string, unknown>) => ({
    ...minimalConfig(),
    db: { ...minimalConfig().db, ...db },
  });

  for (const schema of ['portal', '_portal', 'portal_2', 'a$b']) {
    test(`accepts schema "${schema}"`, () => {
      expect(configSchema.safeParse(withDb({ schema })).success).toBe(true);
    });
  }

  for (const schema of ['2portal', 'my-portal', 'portal; drop', '']) {
    test(`rejects schema "${schema}"`, () => {
      expect(issuePaths(withDb({ schema }))).toEqual(['db.schema']);
    });
  }

  test('rejects a schema name longer than 63 characters', () => {
    expect(
      configSchema.safeParse(withDb({ schema: 'a'.repeat(63) })).success,
    ).toBe(true);
    expect(issuePaths(withDb({ schema: 'a'.repeat(64) }))).toEqual([
      'db.schema',
    ]);
  });

  test('defaults ssl to off and fills pool defaults', () => {
    const { db } = configSchema.parse(minimalConfig());

    expect(db.ssl).toBe(false);
    expect(db.pool).toEqual({
      max: 20,
      min: 0,
      idleTimeout: 30000,
      connectionTimeout: 2000,
      allowExitOnIdle: false,
    });
  });

  test('defaults rejectUnauthorized to true for object ssl', () => {
    const { db } = configSchema.parse(withDb({ ssl: { ca: 'pem' } }));

    expect(db.ssl).toEqual({ rejectUnauthorized: true, ca: 'pem' });
  });
});
