import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

import { patchServerEntry } from './scripts/patch-server-entry';

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
  },
  // Keeps `pg`/`pg-pool`'s circular require lazy instead of hoisted to a static import.
  // dotenv's CJS build starts with a shebang that breaks the dev SSR runner's ESM transform.
  ssr: { external: ['pg', 'pg-pool', 'pg-native', 'dotenv'] },
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
    plugins: ['./server/plugins/preflight.ts'],
  },
  plugins: [
    fumadocsMdx({ macro: { include: ['src/**/*.ts', 'src/**/*.tsx'] } }),
    tailwindcss(),
    tanstackStart({ rsc: { enabled: true }, importProtection: {behavior: 'error'} }),
    rsc(),
    nitro(),
    viteReact(),
    {
      name: 'patch-server-entry',
      apply: 'build',
      buildApp: {
        order: 'post',
        handler: patchServerEntry,
      },
    },
  ],
});
