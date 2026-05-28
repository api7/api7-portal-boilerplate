import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
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
import { ac, roles } from './permissions';

const config = getConfig();

export const getGenericOAuthConfigs = (): GenericOAuthConfig[] => {
  if (process.env.NEXT_PUBLIC_TESTING !== 'true') return [];
  return [
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
    genericOAuth({
      config: getGenericOAuthConfigs(),
    }),
  ] as const;
};

const getTwoFactorConfig = () => {
  const twoFactorEnabled = config.auth.twoFactor.enabled;
  if (!twoFactorEnabled) return [];
  // TOTP-only 2FA. OTP (email/SMS code) is intentionally not configured.
  // Ref: https://www.better-auth.com/docs/plugins/2fa
  return [twoFactor()] as const;
};

export const auth = betterAuth({
  appName: config.app.name,
  baseURL: config.app.baseURL,
  trustedOrigins: config.app.trustedOrigins,
  basePath: AUTH_BASE_PATH,
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
  }),
  experimental: { joins: true },
  emailAndPassword: config.auth.emailAndPassword,
  session: {
    expiresIn: config.auth.session.expiresIn,
    updateAge: config.auth.session.updateAge,
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
    organization({
      ac,
      roles,
      requireEmailVerificationOnInvitation: false,
    }),
    ...getTestingConfig(),
    nextCookies(),
  ],
});
