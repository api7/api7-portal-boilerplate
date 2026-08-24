// In-memory, single-process TTL cache for a zero-argument async function.
export function memoizeWithTtl<T>(fn: () => Promise<T>, ttlMs: number): () => Promise<T> {
  let cached: { value: T; expiresAt: number } | undefined;
  let inFlight: Promise<T> | undefined;

  return async () => {
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    if (!inFlight) {
      inFlight = fn().then((value) => {
        cached = { value, expiresAt: Date.now() + ttlMs };
        return value;
      });
      void inFlight.finally(() => {
        inFlight = undefined;
      });
    }

    return inFlight;
  };
}
