'use client';

import BasicAuthTable from './components/BasicAuthTable';
import KeyAuthTable from './components/KeyAuthTable';
import OAuthTable from './components/OAuthTable';
import { ApplicationIdContext } from './hook';
import A7Tabs from '../ui/tabs';

type ApplicationCredentialsProps = {
  applicationId: string;
};

export const ApplicationCredentials: React.FC<ApplicationCredentialsProps> = ({
  applicationId,
}) => {
  return (
    <ApplicationIdContext.Provider value={applicationId}>
      <A7Tabs
        type="card"
        items={[
          {
            key: 'key-auth',
            label: 'Key Authentication',
            children: <KeyAuthTable application_id={[applicationId]} />,
          },
          {
            key: 'basic-auth',
            label: 'Basic Authentication',
            children: <BasicAuthTable application_id={[applicationId]} />,
          },
          {
            key: 'OAuth',
            label: 'OAuth',
            children: <OAuthTable application_id={[applicationId]} />,
          },
        ]}
      />
    </ApplicationIdContext.Provider>
  );
};
