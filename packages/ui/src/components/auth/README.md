# `components/auth/` — better-auth-ui integration cheatsheet

This directory (plus the plugin files under `../../lib/auth/*-plugin.ts(x)`)
is vendored from the `@better-auth-ui` shadcn registry
(`https://better-auth-ui.com/r/{style}/{name}.json`, `style` = `base-nova`
per `../../../components.json`). Files here are **not hand-written from
scratch** — they're upstream components with project-specific patches
layered on top, and every patch is silently reverted the next time the
registry is re-fetched. This doc is the reference for what those patches are
and how to redo them.

Last verified against `@better-auth-ui/core`/`react` **1.6.44**. Shared by
`apps/site` and `apps/site-start` via the `@api7/portal-ui` workspace
package — see `packages/ui/README.md` for why this package exists and its
build step (short version: `tsc` reads pre-compiled `dist/`, bundlers read
raw `src/`; **rebuild with `pnpm --filter @api7/portal-ui build` after
editing anything here, before trusting `pnpm tsc` in either app**).

## Upgrading

1. Bump `@better-auth-ui/core` and `@better-auth-ui/react` in
   `packages/ui/package.json` (peerDependencies) and in both
   `apps/site/package.json` / `apps/site-start/package.json`, kept in
   lockstep, `pnpm install`.
2. From `packages/ui/`, re-fetch every bundle in use:
   ```sh
   pnpm dlx shadcn@latest add \
     @better-auth-ui/auth @better-auth-ui/organization @better-auth-ui/two-factor \
     @better-auth-ui/settings @better-auth-ui/username @better-auth-ui/admin \
     -o -y
   ```
   Use `--dry-run` first if you want to preview which files would be
   touched before committing to it.
3. `git diff` every touched file. Cross-check against the table below:
   - Listed here → your patch just got reverted. Either restore the
     pre-upgrade version wholesale (`git checkout HEAD -- <file>`, safe when
     the whole diff is the patch and nothing else) or re-apply the patch by
     hand if upstream also changed something else in the same file worth
     keeping.
   - Not listed here → it's very likely a pure upstream change. Skim it
     rather than reverting; genuinely new files (e.g. a new view component)
     usually need wiring into the relevant `*-plugin.tsx`'s `views`/
     `settingsTabs` to actually take effect.
4. `pnpm --filter @api7/portal-ui build`, then `pnpm --filter @api7/portal-ui tsc`.
5. `pnpm tsc` and `pnpm lint` in both `apps/site` and `apps/site-start` —
   there's only one copy of this directory now, so both apps get validated
   against the same upgrade in the same pass.

## Patches `shadcn add` will silently overwrite

| File | Patch | Why |
| --- | --- | --- |
| `additional-field.tsx`, `organization/invite-member-dialog.tsx` | `alignItemWithTrigger={false}` on every `SelectContent` | Team convention — avoids dropdown/trigger misalignment. Applies to *any* `SelectContent` anywhere in the codebase, not just these files. |
| `auth.tsx`, `sign-up.tsx` | `signUpConsentLabel` prop threaded through; TOS checkbox (`tosAccepted`) required when set, `dangerouslySetInnerHTML`-rendered | Configurable sign-up consent text (`app.signUpConsentLabel` in config), passed in by each app's own call site. |
| `sign-in.tsx`, `auth.tsx` | `checkEmailPolicy?: (email: string) => Promise<SignInEmailPolicy>` prop (default: always `{ type: "credentials" }`) drives the two-phase flow: email first → policy lookup → SSO redirect / password form / magic link. Stashes the just-typed password (`stashTwoFactorPassword`) before a forced-2FA redirect so the user isn't asked twice. Reads `?redirectTo=` via `getSafeRedirectTo`. | Policy-based SSO sign-in. `checkEmailPolicy` is **injected**, not imported — it reads each app's own SSO config (`@/lib/auth/check-email-policy`), which is framework-specific (Next Server Action vs. TanStack `createServerFn`) and can't live in this shared package. Each app's `<Auth>` call site passes its own. |
| `provider-button.tsx` | `signIn.oauth2` used instead of `signIn.social` for genericOAuth providers, via a locally-declared `OAuth2SignInClient` structural type cast on `useAuth().authClient` (not an import of either app's own `client.ts`); `loginHint` prop (`login_hint` on the IdP redirect) | Works around better-auth's genericOAuth plugin capturing `ctx.baseURL=""` in a closure under `DynamicBaseURLConfig`, which otherwise produces a relative `redirect_uri`. The local type keeps this package decoupled from either app's concrete `authClient` module — it only asserts the one method shape it actually calls. |
| `organization/create-organization-dialog.tsx` | Slug input hidden; `generateSlug()` mints a random slug instead | Slug isn't user-facing at creation time. |
| `organization/organization-members.tsx` | `useHasPermission({ member: ["create"] })` disables "Invite Member" without permission | Registry version doesn't gate this button at all. |
| `organization/organization-profile.tsx` | Renames via a direct `useMutation` (not the generic `useUpdateOrganization` hook) so the redirect to the new slug's URL fires right after the HTTP response | Going through the standard invalidate-and-refetch path re-fetches with the now-stale old slug and retry-loops for ~7s. |
| `organization/organization-switcher.tsx` | `authorized` prop (server component passes `true` to skip a client-side session-flash); `size="icon"` icon-only trigger variant, whose org avatar is a rounded square — `rounded-md` on the button, plus the `after:` ring and the `data-slot=avatar-image`/`-fallback` slots on the logo | `authorized` avoids a flash-of-unauthenticated-state on SSR. Icon trigger is used in `MainLayout`'s topbar. The square marks an organization apart from a person's circular avatar; every radius listed has to be re-applied together or the corners show through. |
| `two-factor/two-factor-settings.tsx`, `lib/auth/two-factor-plugin.ts` | `twoFactorPlugin({ paths: { setup, security } })` — a custom `paths` option (not part of upstream's `TwoFactorPluginOptions`) defaulting to `/account/two-factor`/`/account/security`, read back via `useAuthPlugin(twoFactorPlugin).paths`. Settings card reads `useConfigStatus().twoFactorRequired`; when set and already enrolled, button reads "Reset two-factor" and never opens `DisableTwoFactorDialog`. | The mandatory-2FA setup page's URL is an app route, not a `viewPaths` entry — injected via the plugin's own options (each app's `providers.tsx` passes its `PATH_ACCOUNT_TWO_FACTOR`/`PATH_ACCOUNT_SECURITY`) instead of importing app-specific route constants directly. |
| `two-factor/enable-two-factor-dialog.tsx` | `mode?: "enable" \| "reset"` (copy only); `required`/`onEnrolled` props (hide Cancel/close, block dismiss until verified, callback instead of just closing); resume-or-enroll (`getTotpUri()` first, `enable()` only on `TOTP_NOT_ENABLED`, so a reload mid-setup doesn't mint a new secret and invalidate an already-scanned QR code); `required`/`onEnrolled`/`mode` are snapshotted on dialog-open, not read live | Single component serves both the voluntary settings-page flow and the mandatory `/account/two-factor` enrollment page. |
| `verify-email.tsx` | `callbackURL` built via `getSafeRedirectTo(redirectTo, baseURL)` instead of using `redirectTo` raw | `redirectTo` round-trips through a verification email; must be re-validated here rather than trusting it wasn't tampered with in transit. |
| `../../lib/auth/use-sign-in-continuation.ts` | `redirectOverride` param; when `twoFactorRequired` and the user isn't enrolled, stashes the password and navigates to the `twoFactorPlugin`'s configured `paths.setup` instead of `redirectTo` | Same injection mechanism as `two-factor-settings.tsx` above — looks the plugin instance up from `plugins`, doesn't import app route constants. |

Every other file the bundles touch (`settings/**`, `two-factor/two-factor-challenge.tsx`,
`two-factor/backup-codes.tsx`, `two-factor/disable-two-factor-dialog.tsx`,
`two-factor/regenerate-backup-codes-dialog.tsx`, `organization/*` not listed
above, `admin/`, `username/`, `user/`, `last-login-method/`, etc.) is
currently **pure upstream** — never patched, safe to overwrite wholesale on
every upgrade.

## Architecture notes

### Redirect handling: one convention, `?redirectTo=`
Every producer/consumer of a post-auth redirect target uses the query param
name `redirectTo` and `@better-auth-ui/core`'s `getSafeRedirectTo(redirectTo, origin)`
(rejects cross-origin, `//`-prefixed, backslash, and control-character
targets) / `getAuthLinkURL(href, redirectTo)`. There is no fallback-to-
provider-default behavior for a missing param — `getSafeRedirectTo` always
resolves to `"/"` if nothing valid was supplied.

### Two-factor: one page for mandatory and voluntary
`/account/two-factor` (per-app: `app/(session-only)/account/two-factor/page.tsx`
or `routes/_sessionOnly/account/two-factor.tsx`, both rendering this
package's `two-factor/two-factor-setup.tsx`) is the **only** place
`EnableTwoFactorDialog` renders standalone. Every path that needs enrollment
routes here instead of opening the dialog inline:
- Each app's own auth middleware/proxy — not-yet-enrolled + instance requires 2FA → redirect gate.
- `use-sign-in-continuation.ts` — same check, right after sign-in.
- `two-factor-settings.tsx`'s Enable/Reset buttons — voluntary, `navigate()`s here.

`mode`/`required` are computed inside `TwoFactorSetup` from the session
(`user.twoFactorEnabled`) and `useConfigStatus().twoFactorRequired` —
**never** from a URL param, so tampering with the query string can't make a
mandatory dialog dismissible.

### `admin` and `username` plugins: installed, not registered
`../../lib/auth/admin-plugin.ts` (`StopImpersonating` menu item,
`isImpersonatingSession(session)` type guard) and `username-plugin.ts`
(username sign-in + field) exist and are pure upstream, but are **not** in
either app's `providers.tsx` `plugins` array — inert until someone adds them.

**Naming gotcha**: each app's own `lib/auth/admin.ts` has its own
`isImpersonatingSession` with a *different signature* —
`isImpersonatingSession(impersonatedBy: string | null | undefined)`, vs. the
plugin's `isImpersonatingSession(session)`. Both are imported by full path
everywhere, so there's no accidental cross-call today, but don't assume
they're interchangeable.

### `accept-invitation.tsx` (added in 1.6.44)
Wired into `organization-plugin.tsx`'s `views.auth.acceptInvitation`. Renders
at `/auth/accept-invitation?invitationId={id}`, requires an authenticated
session (`useAuthenticate`), shows accept/reject for a pending, unexpired
invitation. This is the **only** thing 1.6.44 added toward
[#510](https://github.com/api7/api7ee-developer-portal/issues/510) — it does
not touch `organization-invitations.tsx` (the admin-facing table), so
[#511](https://github.com/api7/api7ee-developer-portal/issues/511)'s
expired-state/resend/hide-cancelled asks are still unaddressed by upstream,
and #510's landing-page-redirect-hides-pending-invitations issue is still an
app-level bug, not something this upgrade fixed.

## Files that stay per-app, not in this package

Registry-managed files (this directory, `lib/auth/*-plugin.ts(x)`,
`use-sign-in-continuation.ts`, `use-resend-cooldown.ts`,
`use-two-factor-password.ts`, `two-factor.ts`, `two-factor-methods.ts`,
`pending-two-factor-password.ts`) live in `packages/ui`. Everything else in
each app's own `src/lib/auth/` is genuinely app-specific and was deliberately
**not** moved:
- `check-email-policy.ts` — different server-execution mechanism per
  framework (Next Server Action vs. TanStack `createServerFn`); injected
  into `<Auth checkEmailPolicy={...}>` instead.
- `client.ts` — the concrete `authClient` instance (app-specific `baseURL`).
- `permissions.ts`, `role.ts`, `organization.ts`, `email-policy.ts`,
  `admin.ts`, `admin.server.ts`, `platform-admin.server.ts`,
  `useApplicationPermission.ts`, `middleware.ts` (site-start) — pure app
  business logic that happens to live in the same directory by convention,
  never touched by `shadcn add`.

`apps/site-start` also has `src/lib/compat/next-navigation.ts` and
`next-link.tsx` — Vite aliases that let this package's vendored files (which
still literally `import ... from "next/navigation"` / `"next/link"`, exactly
as shipped by the registry) run unmodified under TanStack Router. `apps/site`
needs no such shim since it's the real Next.js.
