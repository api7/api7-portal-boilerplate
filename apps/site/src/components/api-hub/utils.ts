import type { ApiProduct } from '@api7/portal-sdk/unstable-types';

import { useCallback, useMemo } from 'react';

import { produce } from 'immer';
import { set } from 'lodash-es';
import { parse, stringify } from 'yaml';
import { BasicAuthCredential, KeyAuthCredential } from '@/types/portal-sdk';
import { authClient } from '@/lib/auth/client';
import useSubscriptionList from '@/lib/query/useSubscriptionList';
import useCredentialList from '@/lib/query/useCredentialList';
import { dereference } from '@scalar/openapi-parser';

export type ApiProductExternal = Extract<ApiProduct, { type: 'external' }>;
export const getServerUrls = (data: ApiProductExternal): string[] =>
  'server_urls' in data ? data.server_urls : [data.server_url];

export type ApiProductGateway = Extract<ApiProduct, { type: 'gateway' }>;
export const useParsedProduct = (data: ApiProductGateway) => {
  const session = authClient.useSession();
  const authorized = !!session.data?.user;
  const subscribedAppsReq = useSubscriptionList({
    api_product_id: data?.id,
    status: ['subscribed'],
    enabled: authorized,
  });

  const subscribedAppIds = useMemo(
    () => subscribedAppsReq.data?.map((app) => app.application_id),
    [subscribedAppsReq.data]
  );
  const keyAuthCredentialReq = useCredentialList({
    savePage: false,
    enabled: authorized && !!subscribedAppIds?.length,
    initParams: {
      auth_method: 'key-auth',
      application_id: subscribedAppIds,
    },
  });
  const basicAuthCredentialReq = useCredentialList({
    savePage: false,
    enabled: authorized && !!subscribedAppIds?.length,
    initParams: {
      auth_method: 'basic-auth',
      application_id: subscribedAppIds,
    },
  });
  const keyAuthPlugin = (keyAuthCredentialReq.data?.[0] as KeyAuthCredential)?.[
    'key-auth'
  ];
  const basicAuthPlugin = (
    basicAuthCredentialReq.data?.[0] as BasicAuthCredential
  )?.['basic-auth'];

  const yamlProducer = useCallback(
    (d: Record<string, unknown>) => {
      const securitySchemes: Record<string, object> = {};
      // Add key-auth if configured
      if (data?.auth['key-auth']) {
        securitySchemes['Key Authentication'] = {
          type: 'apiKey',
          in: 'header',
          name: data.auth['key-auth'].header || 'apikey',
          value: keyAuthPlugin?.key,
        };
      }
      // Add basic-auth if configured
      if (data?.auth['basic-auth']) {
        securitySchemes['Basic Authentication'] = {
          type: 'http',
          scheme: 'basic',
          username: basicAuthPlugin?.username,
          password: basicAuthPlugin?.password,
        };
      }
      set(d, 'components.securitySchemes', securitySchemes);
    },
    [basicAuthPlugin, data.auth, keyAuthPlugin]
  );

  const openAPIs = useMemo(() => {
    const list = data.raw_openapis ?? [];
    return list.map((raw) => {
      const produced = produce(parse(raw), yamlProducer);
      return {
        str: stringify(produced),
        parsed: dereference(produced),
      };
    });
  }, [data.raw_openapis, yamlProducer]);

  // Get credentials for authentication
  const authConfig = useMemo(() => {
    const auth: Record<string, object> = {};

    // Add key-auth credentials if available
    if (data?.auth['key-auth'] && keyAuthCredentialReq?.data?.length) {
      if (keyAuthPlugin?.key) {
        auth['Key Authentication'] = {
          type: 'apiKey',
          in: 'header',
          name: data.auth['key-auth'].header || 'apikey',
          key: keyAuthPlugin.key,
        };
      }
    }

    // Add basic-auth credentials if available
    if (data?.auth['basic-auth'] && basicAuthCredentialReq?.data?.length) {
      if (basicAuthPlugin?.username && basicAuthPlugin?.password) {
        auth['Basic Authentication'] = {
          type: 'http',
          scheme: 'basic',
          username: basicAuthPlugin.username,
          password: basicAuthPlugin.password,
        };
      }
    }

    return Object.keys(auth).length > 0 ? auth : undefined;
  }, [
    data.auth,
    keyAuthCredentialReq.data?.length,
    basicAuthCredentialReq.data?.length,
    keyAuthPlugin,
    basicAuthPlugin,
  ]);

  const preferredSecurityScheme = useMemo(() => {
    const schemes = [];
    if (data?.auth['key-auth']) {
      schemes.push('Key Authentication');
    }
    if (data?.auth['basic-auth']) {
      schemes.push('Basic Authentication');
    }
    return schemes;
  }, [data.auth]);

  return {
    openAPIs,
    isLoading:
      subscribedAppsReq.isLoading ||
      keyAuthCredentialReq.isLoading ||
      basicAuthCredentialReq.isLoading,
    authentication: {
      preferredSecurityScheme,
      securitySchemes: authConfig,
    },
  };
};
