import { pick } from 'lodash';
import { keycloakConfig } from '../fixtures/keycloak/keycloakConfig';
import KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import { ConnectionConfig } from '@keycloak/keycloak-admin-client/lib/client';
import { expect, Page } from '@playwright/test';

export const newKCAdminClient = async (config: ConnectionConfig) => {
  const Client = (await import('@keycloak/keycloak-admin-client')).default;
  return new Client(config);
};
export const kcDeleteClients = async (kcAdminClient: KeycloakAdminClient) => {
  const findQuery = pick(keycloakConfig.client, 'clientId');
  const clients = await kcAdminClient.clients.find(findQuery);
  await Promise.allSettled(
    clients?.map((c) => kcAdminClient.clients.del({ id: c.id }))
  );
};

export const kcAdmin = {
  username: 'kc_admin',
  password: 'KHZ0yG4al1',
};

export const kcUILogin = async (page: Page) => {
  await expect(page).toHaveURL(/keycloak/);
  await page.fill('#username', kcAdmin.username);
  await page.fill('#password', kcAdmin.password);
  await page.click('#kc-login');
};
