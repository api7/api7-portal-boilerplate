# `@api7/portal-ui`

Shared shadcn/better-auth-ui component package, consumed by `apps/site`
(TanStack Start). Contains `components/ui/*` (shadcn primitives) and
`components/auth/*` + `lib/auth/*-plugin.ts(x)` (vendored `@better-auth-ui`
registry components). See `src/components/auth/README.md` for the
upgrade/re-patch workflow.

## Why this package has a build step

Bundling (Vite/webpack) never reads `dist/` — `package.json`'s `exports` map
points bundlers at the raw `./src/**/*.ts(x)` via the `default` condition, so
editing source and re-running the app's dev server / build works exactly like
any other workspace file, no rebuild needed.

**`tsc` is the one thing that reads `dist/`**, via the `types` condition, and
this is deliberate, not an optimization — it's the fix for a real, structural
bug:

`better-auth` declares optional peer dependencies on framework adapters
(`next`, `@tanstack/react-start`, `drizzle-orm`, `drizzle-kit`, `pg`, `vue`,
...). This package declares no such peer at all, while `apps/site` genuinely
needs `@tanstack/react-start` in its peer chain, so pnpm — correctly —
resolves `better-auth` (and everything peer-chained through it:
`@better-auth-ui/core`, `@better-auth-ui/react`) to structurally distinct
instances for the package versus the app, even though both `package.json`s
pin the identical `"1.6.44"`. If this package's raw `.tsx` source were
compiled directly by the app's own `tsc`, the app's compiler would resolve
`@better-auth-ui/core` through its own instance while computing this
package's exported types — and generic inference (e.g.
`useAuthPlugin<T>(organizationPlugin)`) collapses to `Partial<X> | undefined`
across the mismatch. This is not fixable by pinning versions or deduping
`node_modules`: this package can't declare a peer on `@tanstack/react-start`
without forcing every consumer to install a framework it might not use, and
`apps/site` genuinely needs it — pnpm can't converge that.

Pre-compiled `.d.ts` sidesteps it: `tsc -p tsconfig.build.json` resolves the
generics *once*, using this package's own single consistent instance, and
emits the *already-computed*, fully-expanded structural type (no leftover
reference to `@better-auth-ui/core`'s own type names) into `dist/`. The
consuming app's `tsc` then does one flat structural comparison against that
frozen shape instead of re-deriving it through a second, differently-resolved
instance — which is what actually made the errors disappear.

## Rebuilding

`dist/` is gitignored and rebuilds automatically via the `prepare` script —
but pnpm only runs `prepare` when it actually re-links the workspace (a truly
fresh `pnpm install`, e.g. after deleting `node_modules`), **not** on every
`pnpm install` invocation. After editing anything under `src/`, rebuild
explicitly before relying on `pnpm tsc` in the app:

```sh
pnpm --filter @api7/portal-ui build
```

Forgetting this doesn't break the dev server or a production build (those
never touch `dist/`) — only `tsc` output goes stale.
