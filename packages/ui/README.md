# `@api7/portal-ui`

Shared shadcn/better-auth-ui component package, consumed by both `apps/site`
(Next.js) and `apps/site-start` (TanStack Start). Contains `components/ui/*`
(shadcn primitives) and `components/auth/*` + `lib/auth/*-plugin.ts(x)`
(vendored `@better-auth-ui` registry components). See
`apps/site/src/components/auth/README.md` for the upgrade/re-patch workflow —
that doc is unchanged by this package existing, it just now targets this
directory instead of an app's own `src/`.

## Why this package has a build step

Bundling (Vite/webpack) never reads `dist/` — `package.json`'s `exports` map
points bundlers at the raw `./src/**/*.ts(x)` via the `default` condition, so
editing source and re-running an app's dev server / build works exactly like
any other workspace file, no rebuild needed.

**`tsc` is the one thing that reads `dist/`**, via the `types` condition, and
this is deliberate, not an optimization — it's the fix for a real, structural
bug:

`better-auth` declares optional peer dependencies on framework adapters
(`next`, `@tanstack/react-start`, `drizzle-orm`, `drizzle-kit`, `pg`, `vue`,
...). `apps/site` (Next.js) and `apps/site-start` (TanStack Start) each pull
in a *different* subset of those peers, so pnpm — correctly — resolves
`better-auth` (and everything peer-chained through it: `@better-auth-ui/core`,
`@better-auth-ui/react`) to structurally distinct instances per consumer, even
though every `package.json` pins the identical `"1.6.44"`. If this package's
raw `.tsx` source is compiled directly by *both* apps' own `tsc`, each app's
compiler resolves `@better-auth-ui/core` through its *own* instance while
computing this package's exported types — and generic inference (e.g.
`useAuthPlugin<T>(organizationPlugin)`) collapses to `Partial<X> | undefined`
across the mismatch. This is not fixable by pinning versions or deduping
`node_modules`: `apps/site` genuinely needs `next` in its peer chain and
`apps/site-start` genuinely needs `@tanstack/react-start` in its — pnpm can't
converge that.

Pre-compiled `.d.ts` sidesteps it: `tsc -p tsconfig.build.json` resolves the
generics *once*, using this package's own single consistent instance, and
emits the *already-computed*, fully-expanded structural type (no leftover
reference to `@better-auth-ui/core`'s own type names) into `dist/`. A
consuming app's `tsc` then does one flat structural comparison against that
frozen shape instead of re-deriving it through a second, differently-resolved
instance — which is what actually made the errors disappear (verified: 326
errors in `apps/site-start` → 0, 57 in `apps/site` → 0).

## Rebuilding

`dist/` is gitignored and rebuilds automatically via the `prepare` script —
but pnpm only runs `prepare` when it actually re-links the workspace (a truly
fresh `pnpm install`, e.g. after deleting `node_modules`), **not** on every
`pnpm install` invocation. After editing anything under `src/`, rebuild
explicitly before relying on `pnpm tsc` in either app:

```sh
pnpm --filter @api7/portal-ui build
```

Forgetting this doesn't break the dev server or a production build (those
never touch `dist/`) — only `tsc` output goes stale.
