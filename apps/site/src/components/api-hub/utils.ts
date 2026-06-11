import type { ApiProduct } from '@api7/portal-sdk/unstable-types';
import { produce } from 'immer';
import { set } from 'lodash-es';
import { useCallback, useMemo } from 'react';
import { parse, stringify } from 'yaml';

export type ApiProductExternal = Extract<ApiProduct, { type: 'external' }>;
export const getServerUrls = (data: ApiProductExternal): string[] =>
  'server_urls' in data ? data.server_urls : [data.server_url];

export type ApiProductGateway = Extract<ApiProduct, { type: 'gateway' }>;
export const useParsedProduct = (data: ApiProductGateway) => {
  // Declare the security schemes the API expects, but never auto-fill developer
  // credentials. Secrets (key-auth key, basic-auth password) are view-once and
  // are not returned on read paths, so the developer enters them manually in the
  // "Try it" panel.
  const yamlProducer = useCallback(
    (d: Record<string, unknown>) => {
      const securitySchemes: Record<string, object> = {};
      if (data?.auth['key-auth']) {
        securitySchemes['Key Authentication'] = {
          type: 'apiKey',
          in: 'header',
          name: data.auth['key-auth'].header || 'apikey',
        };
      }
      if (data?.auth['basic-auth']) {
        securitySchemes['Basic Authentication'] = {
          type: 'http',
          scheme: 'basic',
        };
      }
      set(d, 'components.securitySchemes', securitySchemes);
    },
    [data.auth],
  );

  const openAPIs = useMemo(() => {
    const list = data.raw_openapis ?? [];
    return list.map((raw) => {
      const produced = produce(parse(raw) as Record<string, unknown>, yamlProducer);
      return {
        str: stringify(produced),
        title: (produced as Record<string, unknown> & { info?: { title?: string } }).info?.title,
      };
    });
  }, [data.raw_openapis, yamlProducer]);

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
    isLoading: false,
    authentication: {
      preferredSecurityScheme,
      securitySchemes: undefined,
    },
  };
};
