import { expect, request } from '@playwright/test';
import { diff } from 'just-diff';
import * as net from 'net';
import { parse, stringify } from 'yaml';

export const randomId = (prefix = '') => {
  const seed = (+Date.now()).toString();
  return `${prefix}${seed}`;
};

/**
 * Wait for a port to be listening
 */
export const waitForPort = async (
  port: number,
  timeout = 30000,
  host = 'localhost'
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const isOpen = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, host);
    });
    if (isOpen) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Port ${port} not listening after ${timeout}ms`);
};

export const diffPatch = <T extends object>(
  oldData: T,
  newData: T,
  pathPrefix = ''
) => diff(oldData, newData, (arr: string[]) => [pathPrefix, ...arr].join('/'));

/**
 * Parse ConfigMap YAML payload into a typed object.
 */
export function parseYaml<T>(yaml: string): T {
  try {
    const parsed = parse(yaml);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid YAML: expected an object');
    }

    return parsed as T;
  } catch (e) {
    throw new Error(
      `Failed to parse YAML: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

/**
 * Serialize an object to stable YAML for ConfigMap updates.
 */
export function stringifyYaml(obj: unknown): string {
  try {
    return stringify(obj, {
      indent: 2,
      lineWidth: 0,
      doubleQuotedAsJSON: false,
      defaultStringType: 'QUOTE_DOUBLE',
    });
  } catch (e) {
    throw new Error(
      `Failed to serialize YAML: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}


export interface TokenRequestParams {
  tokenURL: string;
  clientID: string;
  clientSecret: string;
  username: string;
  password: string;
  scope?: string;
}

export async function getAccessToken(params: TokenRequestParams): Promise<string> {
  const {
    tokenURL,
    clientID,
    clientSecret,
    username,
    password,
    scope,
  } = params;

  const api = await request.newContext();

  const formData: Record<string, string> = {
    grant_type: 'password',
    client_id: clientID,
    client_secret: clientSecret,
    username,
    password,
  };

  if (scope) {
    formData.scope = scope;
  }

  const res = await api.post(tokenURL, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    form: formData,
  });

  if (!res.ok()) {
    throw new Error(
      `Failed to get token: ${res.status()} - ${await res.text()}`
    );
  }

  const data = await res.json();
  const token = data.access_token;

  if (!token) {
    throw new Error('access_token is missing in Keycloak response');
  }

  return token;
}
