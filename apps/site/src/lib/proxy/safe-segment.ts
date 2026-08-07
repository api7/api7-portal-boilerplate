/**
 * Rejects catch-all proxy segments that could redirect the upstream request
 * outside the resource scope the caller has already validated.
 *
 * Next.js decodes each catch-all URL segment before it reaches the route
 * handler, but only splits on literal `/` in the raw request path — so an
 * encoded separator (`%2f`, `%5c`, ...) survives routing as part of a single
 * segment and comes out *containing* a decoded `/` or `\`. Both proxy routes
 * then join segments back together with `/` and hand the result to axios,
 * whose Node HTTP adapter re-parses the full URL with `new URL()`, which
 * collapses `.`/`..` dot-segments (and treats `\` as `/` for http(s) URLs)
 * — silently retargeting the request to a different upstream path than the
 * one the resource allowlist / role checks approved.
 *
 * A single decode pass isn't enough: the segment may still be wrapped in
 * further percent-encoding (`%252f`, `%25252f`, ...) that only becomes a real
 * `/` once something decodes it again — harmless to our own `new URL()`
 * call, but we forward the bytes as-is to the upstream Portal API, a
 * separate service whose own request parsing we don't control, and
 * percent-decoding a path segment before using it is completely standard
 * HTTP-server behavior. Rather than enumerate every wrapped depth (an
 * open-ended list), this decodes the segment looking for a fixed point,
 * within a bounded number of passes (`MAX_DECODE_ITERATIONS`), and checks
 * *that* for a separator. Any decode step that turns out to be malformed is
 * rejected outright rather than falling back to a partial result:
 * percent-encoding that different parsers would resolve differently is
 * itself the kind of ambiguity this class of bug lives in. A segment nested
 * deeper than the iteration budget is rejected the same way — not every
 * nesting depth reaches a fixed point within the budget, and returning a
 * still-partially-encoded value as if it were canonical would defeat the
 * whole point of this check.
 *
 * Deliberately does NOT Unicode-normalize (e.g. NFKC-folding a fullwidth
 * U+FF0F solidus down to ASCII `/`) — no URL/HTTP spec or mainstream parser
 * treats look-alike characters as separators (verified: WHATWG `URL` just
 * percent-encodes U+FF0F as ordinary path content, it doesn't split on it),
 * so there's no real mechanism in this pipeline for that to matter.
 *
 * The same canonicalization also has to reject a decoded `?` or `#`, and any
 * control character (U+0000-U+001F, U+007F). Both proxy routes build the
 * forwarded URL as a plain string and pass query params separately via
 * axios's `config.params`; axios's `buildURL` looks for an existing `?`/`#`
 * in that string *before* merging in `config.params`. A canonicalized
 * segment containing a decoded `?` would be read as the start of an existing
 * query string, letting the segment inject arbitrary query keys ahead of the
 * legitimate params; one containing a decoded `#` would be read as a
 * fragment and have everything after it silently stripped before the
 * request is sent — retargeting the request the same way an unencoded `/`
 * or `\` would, just via a different axios code path. Control characters are
 * rejected because they can alter how the forwarded path is parsed or
 * logged downstream.
 */
const MAX_DECODE_ITERATIONS = 5;

const CONTROL_CHAR_PATTERN = /[\x00-\x1f\x7f]/;

function canonicalizeSegment(segment: string): string | null {
  let current = segment;
  for (let i = 0; i < MAX_DECODE_ITERATIONS; i++) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return null;
    }
    if (decoded === current) return current;
    current = decoded;
  }
  // Iteration budget exhausted without reaching a fixed point — the segment
  // is still at least one decode pass away from its true form. Treat that
  // the same as malformed encoding rather than guessing it's safe.
  return null;
}

export function hasUnsafeProxySegment(segments: string[]): boolean {
  return segments.some((segment) => {
    const canonical = canonicalizeSegment(segment);
    if (canonical === null) return true;
    return (
      canonical === '' ||
      canonical === '.' ||
      canonical === '..' ||
      canonical.includes('/') ||
      canonical.includes('\\') ||
      canonical.includes('?') ||
      canonical.includes('#') ||
      CONTROL_CHAR_PATTERN.test(canonical)
    );
  });
}
