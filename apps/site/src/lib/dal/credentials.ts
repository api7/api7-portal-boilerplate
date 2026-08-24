import type {
  CreateApplicationCredentialReq,
  ListCredentialsData,
  RegenerateApplicationCredentialReq,
  UpdateApplicationCredentialReq,
} from '@api7/portal-sdk/unstable-types';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import {
  orgScopedMiddleware,
  orgWriteRoleMiddleware,
} from '../auth/middleware';
import { getPortalForOrganization } from '../portal-sdk/server';

const orgSlugSchema = z.object({ organizationSlug: z.string().min(1) });
const orgApplicationSchema = orgSlugSchema.extend({
  applicationId: z.string().min(1),
});
const orgCredentialSchema = orgApplicationSchema.extend({
  credentialId: z.string().min(1),
});

export const listCredentials = createServerFn({ method: 'GET' })
  .middleware([orgScopedMiddleware])
  .validator(
    (data: { organizationSlug: string } & ListCredentialsData['query']) => data,
  )
  .handler(async ({ data: { organizationSlug: _, ...query }, context }) => {
    return getPortalForOrganization(context.organizationId).credential.list(
      query,
    );
  });

export const createCredential = createServerFn({ method: 'POST' })
  .middleware([orgWriteRoleMiddleware])
  .validator(
    (
      data: {
        organizationSlug: string;
        applicationId: string;
      } & CreateApplicationCredentialReq,
    ) => data,
  )
  .handler(
    async ({
      data: { organizationSlug: _, applicationId, ...payload },
      context,
    }) => {
      return getPortalForOrganization(
        context.organizationId,
      ).application.credential.create(applicationId, payload);
    },
  );

export const updateCredential = createServerFn({ method: 'POST' })
  .middleware([orgWriteRoleMiddleware])
  .validator(
    (
      data: {
        organizationSlug: string;
        applicationId: string;
        credentialId: string;
      } & UpdateApplicationCredentialReq,
    ) => data,
  )
  .handler(
    async ({
      data: { organizationSlug: _, applicationId, credentialId, ...payload },
      context,
    }) => {
      return getPortalForOrganization(
        context.organizationId,
      ).application.credential.update(applicationId, credentialId, payload);
    },
  );

export const deleteCredential = createServerFn({ method: 'POST' })
  .middleware([orgWriteRoleMiddleware])
  .validator(orgCredentialSchema)
  .handler(async ({ data: { applicationId, credentialId }, context }) => {
    return getPortalForOrganization(
      context.organizationId,
    ).application.credential.delete(applicationId, credentialId);
  });

export const regenerateCredential = createServerFn({ method: 'POST' })
  .middleware([orgWriteRoleMiddleware])
  .validator(
    (
      data: {
        organizationSlug: string;
        applicationId: string;
        credentialId: string;
      } & RegenerateApplicationCredentialReq,
    ) => data,
  )
  .handler(
    async ({
      data: { organizationSlug: _, applicationId, credentialId, ...payload },
      context,
    }) => {
      return getPortalForOrganization(
        context.organizationId,
      ).application.credential.regenerate(applicationId, credentialId, payload);
    },
  );
