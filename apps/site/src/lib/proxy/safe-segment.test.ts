import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hasUnsafeProxySegment } from './safe-segment';

/** Nests `encodeURIComponent` `layers` times so decoding it back requires
 * exactly `layers` passes to reach a real `/`. */
const nestSlashEncoding = (layers: number) => {
  let value = '/';
  for (let i = 0; i < layers; i++) value = encodeURIComponent(value);
  return value;
};

describe('hasUnsafeProxySegment', () => {
  it('allows plain resource names and ids', () => {
    assert.equal(hasUnsafeProxySegment(['applications']), false);
    assert.equal(hasUnsafeProxySegment(['applications', 'abc-123']), false);
  });

  it('rejects empty, dot, and dot-dot segments', () => {
    assert.equal(hasUnsafeProxySegment(['applications', '']), true);
    assert.equal(hasUnsafeProxySegment(['applications', '.']), true);
    assert.equal(hasUnsafeProxySegment(['applications', '..']), true);
  });

  it('rejects a literal separator embedded in a segment', () => {
    assert.equal(
      hasUnsafeProxySegment(['applications', '../approvals']),
      true,
    );
  });

  it('rejects percent-encoded separators nested within the decode budget', () => {
    for (const layers of [1, 2, 3, 4, 5]) {
      const segment = `..${nestSlashEncoding(layers)}approvals`;
      assert.equal(
        hasUnsafeProxySegment(['applications', segment]),
        true,
        `${layers}-layer encoding should be rejected`,
      );
    }
  });

  it('rejects a segment nested one layer beyond the decode budget instead of treating it as safe', () => {
    // MAX_DECODE_ITERATIONS is 5 — 6 layers can never reach a fixed point
    // within that budget. The guard must fail closed here rather than
    // silently returning the still-partially-encoded value as "canonical".
    const segment = `..${nestSlashEncoding(6)}approvals`;
    assert.equal(hasUnsafeProxySegment(['applications', segment]), true);
  });
});
