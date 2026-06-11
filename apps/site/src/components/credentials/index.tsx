'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { useConfigStatus } from '@/lib/config/config-status-context';
import { cn } from '@/lib/utils';

import BasicAuthTable from './components/BasicAuthTable';
import KeyAuthTable from './components/KeyAuthTable';
import OAuthTable from './components/OAuthTable';
import { ApplicationIdContext } from './hook';

// URL param value → internal key
const PARAM_TO_AUTH_TYPE: Record<string, string> = {
  'key-auth': 'key-auth',
  'basic-auth': 'basic-auth',
  oauth: 'OAuth',
};
// Internal key → URL param value
const AUTH_TYPE_TO_PARAM: Record<string, string> = {
  'key-auth': 'key-auth',
  'basic-auth': 'basic-auth',
  OAuth: 'oauth',
};

type ApplicationCredentialsProps = {
  applicationId: string;
};

export const ApplicationCredentials: React.FC<ApplicationCredentialsProps> = ({
  applicationId,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { applicationDetail } = useConfigStatus();

  const items = useMemo(() => {
    const tabsConfig = applicationDetail?.credentialsTabs;

    return [
      {
        key: 'key-auth',
        label: 'Key Authentication',
        enabled: tabsConfig?.keyAuth,
      },
      {
        key: 'basic-auth',
        label: 'Basic Authentication',
        enabled: tabsConfig?.basicAuth,
      },
      {
        key: 'OAuth',
        label: 'OAuth',
        enabled: tabsConfig?.oauth,
      },
    ].filter((tab) => tab.enabled);
  }, [applicationDetail?.credentialsTabs]);

  const authTypeParam = searchParams.get('authtype');
  const activeKey = authTypeParam
    ? PARAM_TO_AUTH_TYPE[authTypeParam]
    : undefined;
  const effectiveKey =
    activeKey && items.find((t) => t.key === activeKey)
      ? activeKey
      : items[0]?.key;

  const handleAuthTypeChange = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('authtype', AUTH_TYPE_TO_PARAM[key] ?? key.toLowerCase());
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const tabSwitcher =
    items.length > 1 ? (
      <div
        role="tablist"
        className="inline-flex items-center rounded-lg bg-muted p-0.75 h-8 shrink-0"
      >
        {items.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={effectiveKey === tab.key}
            onClick={() => handleAuthTypeChange(tab.key)}
            className={cn(
              'px-2 py-0.5 text-sm font-medium rounded-md transition-all whitespace-nowrap',
              effectiveKey === tab.key
                ? 'bg-background text-foreground shadow-sm dark:border dark:border-input dark:bg-input/30'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    ) : undefined;

  return (
    <ApplicationIdContext.Provider value={applicationId}>
      {effectiveKey === 'key-auth' && (
        <KeyAuthTable
          application_id={[applicationId]}
          leadingToolBar={tabSwitcher}
        />
      )}
      {effectiveKey === 'basic-auth' && (
        <BasicAuthTable
          application_id={[applicationId]}
          leadingToolBar={tabSwitcher}
        />
      )}
      {effectiveKey === 'OAuth' && (
        <OAuthTable
          application_id={[applicationId]}
          leadingToolBar={tabSwitcher}
        />
      )}
    </ApplicationIdContext.Provider>
  );
};
