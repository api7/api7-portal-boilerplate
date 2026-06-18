import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getEmailPolicy, isSsoPolicyEmail } from './email-policy';

const providers = [
  {
    domains: ['@company\\.com$', '@example\\.org$'],
    providerId: 'corp-oidc',
  },
];

describe('email SSO policy', () => {
  it('matches configured domains case-insensitively', () => {
    assert.deepEqual(getEmailPolicy('Alice@Company.Com', providers), {
      type: 'sso',
      providerId: 'corp-oidc',
    });
  });

  it('does not match partial domain suffixes', () => {
    assert.equal(
      isSsoPolicyEmail('alice@attackercompany.com', providers),
      false,
    );
  });

  it('returns credentials for unconfigured domains', () => {
    assert.deepEqual(getEmailPolicy('alice@example.com', providers), {
      type: 'credentials',
    });
  });

  it('returns credentials for emails longer than the maximum address length', () => {
    assert.deepEqual(
      getEmailPolicy(`${'a'.repeat(245)}@company.com`, providers),
      {
        type: 'credentials',
      },
    );
  });
});
