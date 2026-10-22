import { expect, test } from '@playwright/test';
import { getEmailPolicy, isSsoPolicyEmail } from '@site/lib/auth/email-policy';

const providers = [
  { providerId: 'corp', domains: ['@corp\\.example\\.com$'] },
  {
    providerId: 'partner',
    domains: ['@partner\\.example$', '@ext\\.example$'],
  },
];

test.describe('getEmailPolicy', () => {
  test('routes an email matching a provider domain to that provider', () => {
    expect(getEmailPolicy('alice@corp.example.com', providers)).toEqual({
      type: 'sso',
      providerId: 'corp',
    });
  });

  test('matches any of a provider’s domains', () => {
    expect(getEmailPolicy('bob@ext.example', providers)).toEqual({
      type: 'sso',
      providerId: 'partner',
    });
  });

  test('falls back to credentials when no domain matches', () => {
    expect(getEmailPolicy('carol@other.example', providers)).toEqual({
      type: 'credentials',
    });
  });

  test('falls back to credentials when no providers are configured', () => {
    expect(getEmailPolicy('alice@corp.example.com', [])).toEqual({
      type: 'credentials',
    });
  });

  test('ignores case and surrounding whitespace in the email', () => {
    expect(getEmailPolicy('  Alice@CORP.Example.com ', providers)).toEqual({
      type: 'sso',
      providerId: 'corp',
    });
  });

  test('ignores case in the configured pattern', () => {
    expect(
      getEmailPolicy('alice@corp.example.com', [
        { providerId: 'corp', domains: ['@CORP\\.EXAMPLE\\.COM$'] },
      ]),
    ).toEqual({ type: 'sso', providerId: 'corp' });
  });

  test('does not match a lookalike domain when the pattern is anchored', () => {
    expect(
      getEmailPolicy('mallory@corp.example.com.evil.example', providers),
    ).toEqual({ type: 'credentials' });
  });

  test('picks the first matching provider when several match', () => {
    expect(
      getEmailPolicy('alice@corp.example.com', [
        { providerId: 'first', domains: ['example\\.com$'] },
        { providerId: 'second', domains: ['@corp\\.example\\.com$'] },
      ]),
    ).toEqual({ type: 'sso', providerId: 'first' });
  });

  test('treats an email longer than 254 characters as credentials', () => {
    const domain = '@corp.example.com';
    const atLimit = `${'a'.repeat(254 - domain.length)}${domain}`;
    const overLimit = `a${atLimit}`;

    expect(getEmailPolicy(atLimit, providers)).toEqual({
      type: 'sso',
      providerId: 'corp',
    });
    expect(getEmailPolicy(overLimit, providers)).toEqual({
      type: 'credentials',
    });
  });
});

test.describe('isSsoPolicyEmail', () => {
  test('is true only for emails routed to SSO', () => {
    expect(isSsoPolicyEmail('alice@corp.example.com', providers)).toBe(true);
    expect(isSsoPolicyEmail('carol@other.example', providers)).toBe(false);
  });
});
