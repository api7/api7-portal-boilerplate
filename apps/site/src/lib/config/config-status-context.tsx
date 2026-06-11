'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { ConfigStatus } from './config-status';

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
