import 'server-only';

import type { BetterAuthPlugin } from 'better-auth';

import { auth, getGenericOAuthConfigs } from '@/lib/auth/server';
import { getConfig } from '@/lib/config';

export type ConfigStatus = {
  socialProviders: string[];
  genericOAuthProviders: { name: string; provider: string; ssoOnly: boolean }[];
  magicLink: boolean;
  twoFactor: boolean;
  requireEmailVerification: boolean;
  applicationDetail: {
    subscriptions: boolean;
    usage: boolean;
    credentialsTabs: {
      keyAuth: boolean;
      basicAuth: boolean;
      oauth: boolean;
    };
  };
};

export function getConfigStatus(): ConfigStatus {
  const config = getConfig();

  const ssoOnlySet = new Set(
    (config.auth.genericOAuthProviders ?? [])
      .filter((p) => p.ssoOnly)
      .map((p) => p.providerId),
  );

  const socialProviders = Object.keys(auth.options.socialProviders || {});
  const genericOAuthProviders = getGenericOAuthConfigs().map((p) => ({
    name: p.providerId,
    provider: p.providerId,
    ssoOnly: ssoOnlySet.has(p.providerId),
  }));

  const magicLink = !!auth.options.plugins.find(
    (plugin: BetterAuthPlugin) => plugin.id === 'magic-link',
  );
  const twoFactor = !!auth.options.plugins.find(
    (plugin: BetterAuthPlugin) => plugin.id === 'two-factor',
  );

  const applicationDetail = config.app?.applicationDetail ?? {
    subscriptions: true,
    usage: true,
    credentialsTabs: { keyAuth: true, basicAuth: true, oauth: true },
  };

  const requireEmailVerification =
    config.auth.emailAndPassword.requireEmailVerification;

  return { socialProviders, genericOAuthProviders, magicLink, twoFactor, requireEmailVerification, applicationDetail };
}
