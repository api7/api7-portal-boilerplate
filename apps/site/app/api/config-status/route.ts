import { NextResponse } from 'next/server';
import { auth, getGenericOAuthConfigs } from '@/lib/auth/server';
import { BetterAuthPlugin } from 'better-auth';
import { Provider } from '@daveyplate/better-auth-ui';

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

  return NextResponse.json({
    socialProviders,
    genericOAuthProviders,
    magicLink: magicLinkEnabled,
  });
}

export type ConfigStatus = ExtractNextResponseData<typeof GET>;
