import { NextResponse } from 'next/server';
import { auth, getGenericOAuthConfigs } from '@/lib/auth/server';
import { BetterAuthPlugin } from 'better-auth';
import { Provider } from '@daveyplate/better-auth-ui';
import { getConfig } from '@/lib/config';

export async function GET() {
  const socialProviders = Object.keys(auth.options.socialProviders || {});
  const genericOAuthProviders: Provider[] = getGenericOAuthConfigs().map(
    (config) => ({
      name: config.providerId,
      provider: config.providerId,
    })
  );
  const magicLinkEnabled = !!auth.options.plugins.find(
    (plugin: BetterAuthPlugin) => plugin.id === 'magic-link'
  );
  const twoFactorEnabled = !!auth.options.plugins.find(
    (plugin: BetterAuthPlugin) => plugin.id === 'two-factor'
  );
  const config = getConfig();
  const applicationDetail = config.app?.applicationDetail || {
    subscriptions: true,
    usage: true,
    credentialsTabs: {
      keyAuth: true,
      basicAuth: true,
      oauth: true,
    },
  };

  return NextResponse.json({
    socialProviders,
    genericOAuthProviders,
    magicLink: magicLinkEnabled,
    twoFactor: twoFactorEnabled,
    applicationDetail,
  });
}

export type ConfigStatus = ExtractNextResponseData<typeof GET>;
