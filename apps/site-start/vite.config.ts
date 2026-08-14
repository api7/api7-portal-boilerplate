import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@site': fileURLToPath(new URL('./src', import.meta.url)),
      // Some vendored @better-auth-ui components still import Next.js's router.
      'next/navigation': fileURLToPath(
        new URL('./src/lib/compat/next-navigation.ts', import.meta.url),
      ),
      'next/link': fileURLToPath(new URL('./src/lib/compat/next-link.tsx', import.meta.url)),
    },
    // packages/ui (no framework peer in its own tree) and apps/site-start
    // (has @tanstack/react-start) resolve @better-auth-ui/* to two
    // genuinely different pnpm-installed instances, because better-auth's
    // optional peer on the framework adapter makes pnpm compute a different
    // peer-satisfying instance per consumer. Two instances means two
    // separate `createContext()` calls at runtime — <AuthProvider> from one
    // instance's Context is invisible to useAuth() resolving the other.
    // dedupe forces every import of these names to the single instance Vite
    // resolves first, regardless of which file (app or package) does the
    // importing.
    dedupe: ['@better-auth-ui/core', '@better-auth-ui/react', 'better-auth', 'react', 'react-dom'],
  },
  // Keeps `pg`/`pg-pool`'s circular require lazy instead of hoisted to a static import.
  ssr: { external: ['pg', 'pg-pool', 'pg-native'] },
  build: {
    sourcemap: false,
    rolldownOptions: {
      external: [
        // Synthetic WASI import namespaces from shiki's oniguruma binding, not real packages.
        'env',
        'wasi_snapshot_preview1',
      ],
    },
  },
  nitro: {
    // Nitro route rules only support a trailing `**` wildcard, not wildcard-then-suffix,
    // so the per-page `/docs/:path*.md` case is handled directly in `docs/$.tsx` instead.
    routeRules: {
      '/docs.md': { proxy: '/llms.mdx/docs' },
    },
  },
  plugins: [
    fumadocsMdx({ macro: { include: ['src/**/*.ts', 'src/**/*.tsx'] } }),
    tailwindcss(),
    tanstackStart({ rsc: { enabled: true }, importProtection: {behavior: 'error'} }),
    rsc(),
    nitro(),
    viteReact(),
  ],
});
