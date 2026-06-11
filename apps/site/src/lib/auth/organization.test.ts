import assert from 'node:assert/strict';

import test from 'node:test';

import { getOrganizationPluginOptions } from './organization';

test('organization invitation email verification follows auth configuration', () => {
  assert.equal(
    getOrganizationPluginOptions(true).requireEmailVerificationOnInvitation,
    true,
  );
  assert.equal(
    getOrganizationPluginOptions(false).requireEmailVerificationOnInvitation,
    false,
  );
});
