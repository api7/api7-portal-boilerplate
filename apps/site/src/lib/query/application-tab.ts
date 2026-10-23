import type { ConfigStatus } from '@/lib/config/config-status-context';

type ApplicationDetailConfig = ConfigStatus['applicationDetail'];
export type ApplicationTab = 'subscriptions' | 'credentials' | 'usage';

// URL param value → internal tab key
const PARAM_TO_TAB: Record<string, ApplicationTab> = {
  subscriptions: 'subscriptions',
  authentication: 'credentials',
  usage: 'usage',
};

// The tab the application detail page shows for a `tab` search param.
export const resolveApplicationTab = (
  config: ApplicationDetailConfig,
  tabParam: string | null,
): ApplicationTab | undefined => {
  const { credentialsTabs } = config;
  const enabled: ApplicationTab[] = [
    ...(config.subscriptions !== false ? (['subscriptions'] as const) : []),
    ...(credentialsTabs.keyAuth ||
    credentialsTabs.basicAuth ||
    credentialsTabs.oauth
      ? (['credentials'] as const)
      : []),
    ...(config.usage !== false ? (['usage'] as const) : []),
  ];
  const requested = tabParam ? PARAM_TO_TAB[tabParam] : undefined;
  return requested && enabled.includes(requested) ? requested : enabled[0];
};
