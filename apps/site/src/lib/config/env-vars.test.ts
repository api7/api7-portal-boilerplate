import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { replaceEnvVars } from './env-vars';

describe('replaceEnvVars', () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('substitutes a required variable that is set', () => {
    process.env.FOO = 'bar';
    assert.equal(replaceEnvVars('${FOO}'), 'bar');
  });

  it('throws when a required variable is not set', () => {
    delete process.env.MISSING_VAR;
    assert.throws(
      () => replaceEnvVars('${MISSING_VAR}'),
      /MISSING_VAR is not set/,
    );
  });

  it('falls back to the default value when unset', () => {
    delete process.env.MISSING_VAR;
    assert.equal(replaceEnvVars('${MISSING_VAR:fallback}'), 'fallback');
  });

  it('resolves a nested default when the outer variable is unset', () => {
    delete process.env.OUTER;
    process.env.INNER = 'inner-value';
    assert.equal(replaceEnvVars('${OUTER:${INNER:fallback}}'), 'inner-value');
  });

  it('falls back to the innermost default when both variables are unset', () => {
    delete process.env.OUTER;
    delete process.env.INNER;
    assert.equal(replaceEnvVars('${OUTER:${INNER:fallback}}'), 'fallback');
  });

  it('leaves surrounding text untouched', () => {
    process.env.HOST = 'example.com';
    assert.equal(
      replaceEnvVars('https://${HOST}/path'),
      'https://example.com/path',
    );
  });
});
