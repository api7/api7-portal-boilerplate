'use client';

import { createContext, useContext, type ReactNode } from 'react';

// Computed server-side (reads each app's own config system) and handed down
// as `initialConfigStatus` — this package only owns the shape, not how it's
// produced. Each app's own status-computation module should conform to it.
export type ConfigStatus = {
  socialProviders: string[];
  genericOAuthProviders: { name: string; provider: string; ssoOnly: boolean }[];
  magicLink: boolean;
  twoFactor: boolean;
  twoFactorRequired: boolean;
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

const ConfigStatusContext = createContext<ConfigStatus | null>(null);

export function ConfigStatusProvider({
  value,
  children,
}: {
  value: ConfigStatus;
  children: ReactNode;
}) {
  return (
    <ConfigStatusContext.Provider value={value}>
      {children}
    </ConfigStatusContext.Provider>
  );
}

export function useConfigStatus(): ConfigStatus {
  const ctx = useContext(ConfigStatusContext);
  if (!ctx) throw new Error('useConfigStatus must be used within ConfigStatusProvider');
  return ctx;
}
