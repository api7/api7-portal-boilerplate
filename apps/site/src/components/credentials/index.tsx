'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import BasicAuthTable from './components/BasicAuthTable';
import KeyAuthTable from './components/KeyAuthTable';
import OAuthTable from './components/OAuthTable';
import { ApplicationIdContext } from './hook';
import A7Tabs from '../ui/tabs';
import { configStatusQueryOptions } from '@/apis/query-option';

type ApplicationCredentialsProps = {
  applicationId: string;
};

export const ApplicationCredentials: React.FC<ApplicationCredentialsProps> = ({
  applicationId,
}) => {
  const { data: configStatus } = useQuery(configStatusQueryOptions);

  const items = useMemo(() => {
    const applicationDetail = configStatus?.applicationDetail;
    const tabsConfig = applicationDetail?.credentialsTabs

    const allTabs = [
      {
        key: 'key-auth',
        label: 'Key Authentication',
        children: <KeyAuthTable application_id={[applicationId]} />,
        enabled: tabsConfig?.keyAuth,
      },
      {
        key: 'basic-auth',
        label: 'Basic Authentication',
        children: <BasicAuthTable application_id={[applicationId]} />,
        enabled: tabsConfig?.basicAuth,
      },
      {
        key: 'OAuth',
        label: 'OAuth',
        children: <OAuthTable application_id={[applicationId]} />,
        enabled: tabsConfig?.oauth,
      },
    ];

    return allTabs.filter((tab) => tab.enabled);
  }, [applicationId, configStatus?.applicationDetail?.credentialsTabs]);

  return (
    <ApplicationIdContext.Provider value={applicationId}>
      <A7Tabs type="card" items={items} />
    </ApplicationIdContext.Provider>
  );
};
