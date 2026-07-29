import 'server-only';

import { BASE_ERROR_CODES } from '@better-auth/core/error';
import { APIError, type BetterAuthPlugin, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import {
  GenericOAuthConfig,
  admin,
  genericOAuth,
  magicLink,
  openAPI,
  organization,
  twoFactor,
} from 'better-auth/plugins';

import { AUTH_BASE_PATH } from '../../constants/api-prefix';
import { getConfig } from '../config';
import { db } from '../db';
import { isSsoPolicyEmail } from './email-policy';
import { getOrganizationPluginOptions } from './organization';

const config = getConfig();

export const getGenericOAuthConfigs = (): GenericOAuthConfig[] => {
  const configProviders = config.auth.genericOAuthProviders ?? [];
  if (process.env.NEXT_PUBLIC_TESTING !== 'true') return configProviders;
  return [
    ...configProviders,
    {
      providerId: 'keycloak',
      clientId: 'devportal-oidc',
      clientSecret: 'devportal-oidc-secret',
      discoveryUrl:
        'http://api7ee3-keycloak:8080/realms/master/.well-known/openid-configuration',
      scopes: ['openid', 'profile', 'email'],
    },
  ];
};

const getGenericOAuthPlugin = () => {
  const configs = getGenericOAuthConfigs();
  if (configs.length === 0) return [];
  return [genericOAuth({ config: configs })] as const;
};

const getTestingConfig = () => {
  if (process.env.NEXT_PUBLIC_TESTING !== 'true') return [];
  return [
    // This uses smtp4dev for testing.
    // For production,
    // Ref: https://www.better-auth.com/docs/plugins/magic-link
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const { default: nodemailer } = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          host: 'smtp4dev.api7.svc.cluster.local',
          port: 25,
          secure: false,
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000,
        });
        await transporter.sendMail({
          from: '"Developer Portal" <noreply@localhost>',
          to: email,
          subject: 'Sign in to Developer Portal',
          html: `<a href="${url}">Click here to sign in</a>`,
          text: `Sign in: ${url}`,
        });
      },
    }),
  ] as const;
};

const SSO_POLICY_LOCAL_AUTH_PATHS = new Set([
  '/sign-in/email',
  '/sign-up/email',
  '/sign-in/magic-link',
  '/request-password-reset',
]);

const getEmailFromBody = (body: unknown): string | null => {
  if (!body || typeof body !== 'object' || !('email' in body)) return null;
  const email = (body as { email?: unknown }).email;
  return typeof email === 'string' ? email : null;
};

const ssoPolicyEnforcement = (): BetterAuthPlugin => ({
  id: 'sso-policy-enforcement',
  hooks: {
    before: [
      {
        matcher: (ctx) => {
          if (!SSO_POLICY_LOCAL_AUTH_PATHS.has(ctx.path ?? '')) return false;
          const email = getEmailFromBody(ctx.body);
          return (
            email !== null && isSsoPolicyEmail(email, config.auth.sso.providers)
          );
        },
        handler: createAuthMiddleware(async () => {
          throw APIError.from('FORBIDDEN', {
            code: 'SSO_REQUIRED_FOR_EMAIL_DOMAIN',
            message: 'This email domain requires SSO sign in.',
          });
        }),
      },
    ],
  },
});

// better-auth's built-in emailAndPassword.onExistingUserSignUp callback runs
// via runInBackgroundOrAwait, which swallows any thrown error — it can only
// run side effects, not block the response. To actually reject sign-up with
// an existing email (instead of the anti-enumeration synthetic-user response
// used when requireEmailVerification is on), intercept it as a before hook.
const rejectDuplicateEmailSignUp = (): BetterAuthPlugin => ({
  id: 'reject-duplicate-email-sign-up',
  hooks: {
    before: [
      {
        matcher: (ctx) => ctx.path === '/sign-up/email',
        handler: createAuthMiddleware(async (ctx) => {
          if (
            !ctx.context.options.emailAndPassword?.enabled ||
            ctx.context.options.emailAndPassword?.disableSignUp
          )
            return;
          const email = getEmailFromBody(ctx.body);
          if (!email) return;
          const existingUser =
            await ctx.context.internalAdapter.findUserByEmail(
              email.toLowerCase(),
            );
          if (!existingUser) return;
          throw APIError.from(
            'UNPROCESSABLE_ENTITY',
            BASE_ERROR_CODES.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL,
          );
        }),
      },
    ],
  },
});

const getTwoFactorConfig = () => {
  const twoFactorEnabled = config.auth.twoFactor.enabled;
  if (!twoFactorEnabled) return [];
  // TOTP-only 2FA. OTP (email/SMS code) is intentionally not configured.
  // allowPasswordless: SSO/OAuth/magic-link-only accounts have no password
  // credential, so they can enable/disable 2FA without one; accounts that do
  // have a password credential are still required to confirm it.
  // Ref: https://www.better-auth.com/docs/plugins/2fa
  return [twoFactor({ allowPasswordless: true })] as const;
};

// Extract hostnames from trustedOrigins to allow dynamic baseURL resolution.
// This lets better-auth derive redirect_uri from the incoming request's host
// instead of a single hardcoded value, supporting multi-domain deployments.
const allowedHosts = (config.app.trustedOrigins ?? []).flatMap((origin) => {
  try {
    return [new URL(origin).host];
  } catch (e) {
    console.warn(
      `[auth] Skipping malformed trustedOrigin "${origin}": ${(e as Error).message}`,
    );
    return [];
  }
});

// Derive the expected protocol from the fallback baseURL. better-auth's
// getProtocolFromSource() may return "https" as its final fallback even for
// plain-HTTP environments (e.g. CI/Docker), which would mark session cookies
// as Secure and cause them to be omitted on subsequent HTTP requests (→ 401).
// Providing an explicit protocol overrides that heuristic.
const fallbackProtocol = (() => {
  try {
    const p = new URL(config.app.baseURL!).protocol;
    return p === 'http:' ? ('http' as const) : ('https' as const);
  } catch {
    return undefined;
  }
})();

export const auth = betterAuth({
  appName: config.app.name,
  baseURL:
    allowedHosts.length > 0
      ? {
          allowedHosts,
          fallback: config.app.baseURL,
          protocol: fallbackProtocol,
        }
      : config.app.baseURL,
  trustedOrigins: config.app.trustedOrigins,
  basePath: AUTH_BASE_PATH,
  // In testing, many parallel workers share the same IP, easily hitting the
  // default 100 req/10s limit and causing 429s that break test fixtures.
  ...(process.env.NEXT_PUBLIC_TESTING === 'true' && {
    rateLimit: { enabled: false },
  }),
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
  }),
  experimental: { joins: true },
  emailAndPassword: config.auth.emailAndPassword,
  session: {
    expiresIn: config.auth.session.expiresIn,
    updateAge: config.auth.session.updateAge,
    cookieCache: { enabled: true, maxAge: 5 * 60, refreshCache: true },
  },
  secret: config.auth.secret,
  socialProviders: config.auth.socialProviders,
  plugins: [
    openAPI(),
    admin({
      adminUserIds: config.auth.adminUserIds,
      impersonationSessionDuration: 60 * 60,
    }),
    ...getTwoFactorConfig(),
    organization(
      getOrganizationPluginOptions(
        config.auth.emailAndPassword.requireEmailVerification,
      ),
    ),
    ...getGenericOAuthPlugin(),
    ssoPolicyEnforcement(),
    rejectDuplicateEmailSignUp(),
    ...getTestingConfig(),
    nextCookies(),
  ],
});
