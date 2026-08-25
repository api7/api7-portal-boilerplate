import { definePlugin } from 'nitro';

import { runPreflightChecks } from '@/lib/preflight';

declare global {
  var __preflightPromise: Promise<void> | undefined;
}

export default definePlugin(() => {
  if (!import.meta.env.DEV) {
    globalThis.__preflightPromise = runPreflightChecks();
  }
});
