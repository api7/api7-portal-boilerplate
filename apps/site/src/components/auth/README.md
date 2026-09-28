# `components/auth/` — better-auth-ui integration cheatsheet

This directory (plus the plugin files under `../../lib/auth/*-plugin.ts(x)`) is vendored from the `@better-auth-ui` shadcn registry (`https://better-auth-ui.com/r/{style}/{name}.json`, `style` = `base-nova` per `../../../components.json`). Files here are **not hand-written from scratch** — they're upstream components with project-specific patches layered on top, and every patch is silently reverted the next time the registry is re-fetched. This doc is the reference for what those patches are and how to redo them.

Last verified against `@better-auth-ui/core`/`react` **1.7.26**.

## Upgrading

1. Bump `@better-auth-ui/core` and `@better-auth-ui/react` in `apps/site/package.json`, kept in lockstep, `pnpm install`.
2. From `apps/site/`, re-fetch every bundle in use:
   ```sh
   pnpm exec shadcn add \
     @better-auth-ui/auth @better-auth-ui/organization @better-auth-ui/two-factor \
     @better-auth-ui/settings @better-auth-ui/username @better-auth-ui/admin \
     -o -y
   ```
   This uses the workspace's own `shadcn` devDependency; `pnpm dlx shadcn@latest` fails under pnpm 12 with a JSON parse error on the registry response. Use `--dry-run` first to preview which files would be touched. `-o` also overwrites the `components/ui/*` primitives the bundles depend on.
3. `git diff` every touched file. Cross-check against the table below:
   - Listed here → your patch just got reverted. Either restore the pre-upgrade version wholesale (`git checkout HEAD -- <file>`, safe when the whole diff is the patch and nothing else) or re-apply the patch by hand if upstream also changed something else in the same file worth keeping.
   - Not listed here → it's very likely a pure upstream change. Skim it rather than reverting; genuinely new files (e.g. a new view component) usually need wiring into the relevant `*-plugin.tsx`'s `views`/`settingsTabs` to actually take effect.
4. `pnpm tsc` and `pnpm lint` in `apps/site`.

## Patches `shadcn add` will silently overwrite

| File | Patch | Why |
| --- | --- | --- |
| `additional-field.tsx`, `organization/invite-member-dialog.tsx`, `organization/organization-teams.tsx`, `admin/admin-users.tsx` | `alignItemWithTrigger={false}` on every `SelectContent` | Team convention — avoids dropdown/trigger misalignment. Applies to *any* `SelectContent` anywhere in the codebase, not just these files. |
| `auth.tsx`, `sign-up.tsx` | `signUpConsentLabel` prop threaded through; TOS checkbox (`tosAccepted`) required when set, `dangerouslySetInnerHTML`-rendered | Configurable sign-up consent text (`app.signUpConsentLabel` in config), passed in by each app's own call site. |
| `sign-in.tsx`, `auth.tsx` | `sign-in.tsx` is a full rewrite that is **not** on upstream's TanStack Form (`useAuthForm`); on upgrade, port upstream's non-form changes into it by hand (e.g. `<ReauthenticationNotice />`) rather than re-applying the patch onto the new file. `checkEmailPolicy?: (email: string) => Promise<SignInEmailPolicy>` prop (default: always `{ type: "credentials" }`) drives the two-phase flow: email first → policy lookup → SSO redirect / password form / magic link. Stashes the just-typed password (`stashTwoFactorPassword`) before a forced-2FA redirect so the user isn't asked twice. Reads `?redirectTo=` via `getSafeRedirectTo`. | Policy-based SSO sign-in. `checkEmailPolicy` is **injected**, not imported — it reads the app's own SSO config (`@/lib/auth/check-email-policy`, a TanStack `createServerFn`) and can't live in this shared package. The app's `<Auth>` call site passes its own. |
| `provider-button.tsx`, `sign-in.tsx` | `loginHint?: string` prop threaded from `sign-in.tsx`'s phase-1 `enteredEmail` through to `signInSocial({ ..., loginHint })` (redirect flow only — `useSignInOAuthPopup`'s `SignInPopupOptions` doesn't have this field, and this app doesn't use popup mode) | Pre-fills the IdP login form so the user isn't asked for their email twice — `loginHint` is forwarded straight to the authorization request. |
| `organization/create-organization-dialog.tsx` | `hideSlug` defaults to `true` (upstream: `false`), and a hidden slug is submitted as a random `generateSlug()` value instead of `undefined` | Slug isn't user-facing at creation time. Upstream derives a hidden slug from the name, which can collide with a reserved first path segment (an org named "Docs" would get `docs`); the server hook keeps whatever slug the client sends. Upstream's plugin-level `hideSlug` isn't used because it would also hide the slug field in `organization-profile.tsx`. |
| `organization/organization-profile.tsx` | Renames via a direct `useMutation` (keyed `organizationMutationKeys.update`, so `ErrorToaster` still reports failures) instead of `useUpdateOrganization`, so the redirect to the new slug's URL fires right after the HTTP response | `useUpdateOrganization` awaits refetches of the organization queries, which re-fetch with the now-stale old slug and retry-loop for ~7s. |
| `organization/organization-switcher.tsx` | The separator under the dropdown header renders only when a header does (`hasHeader`) | Upstream renders it unconditionally. With no active organization (non-org pages, where the plugin `slug` is `null`) and `hidePersonal`, both header branches are empty and the menu opens with a stray line at the top. |
| `two-factor/two-factor-settings.tsx`, `lib/auth/two-factor-plugin.ts` | `twoFactorPlugin({ paths: { setup, security } })` — a custom `paths` option (not part of upstream's `TwoFactorPluginOptions`) defaulting to `/account/two-factor`/`/account/security`, read back via `useAuthPlugin(twoFactorPlugin).paths`. Settings card reads `useConfigStatus().twoFactorRequired`; when set and already enrolled, button reads "Reset two-factor" and never opens `DisableTwoFactorDialog`. | The mandatory-2FA setup page's URL is an app route, not a `viewPaths` entry — injected via the plugin's own options (each app's `providers.tsx` passes its `PATH_ACCOUNT_TWO_FACTOR`/`PATH_ACCOUNT_SECURITY`) instead of importing app-specific route constants directly. |
| `two-factor/enable-two-factor-dialog.tsx` | Not on upstream's TanStack Form; like `sign-in.tsx`, port upstream changes by hand. `mode?: "enable" \| "reset"` (reset calls `disable()` before `enable()`, since Better Auth rejects `enable()` with `TOTP_ALREADY_ENABLED` while a verified authenticator is active); `required`/`onEnrolled` props (hide Cancel/close, block dismiss until verified, callback instead of just closing); resume-or-enroll (`getTotpUri()` first, `enable()` only on `TOTP_NOT_ENABLED`, so a reload mid-setup doesn't mint a new secret and invalidate an already-scanned QR code); `required`/`onEnrolled`/`mode` are snapshotted on dialog-open, not read live | Single component serves both the voluntary settings-page flow and the mandatory `/account/two-factor` enrollment page. |
| `verify-email.tsx` | `callbackURL` built via `getSafeRedirectTo(redirectTo, baseURL)` instead of using `redirectTo` raw | `redirectTo` round-trips through a verification email; must be re-validated here rather than trusting it wasn't tampered with in transit. |
| `../../lib/auth/use-sign-in-continuation.ts` | When `twoFactorRequired` and the user isn't enrolled, stashes the password and navigates to the `twoFactorPlugin`'s configured `paths.setup` instead of `redirectTo` | Same injection mechanism as `two-factor-settings.tsx` above — looks the plugin instance up from `plugins`, doesn't import app route constants. |

Every other file the bundles touch (`settings/**`, `two-factor/two-factor-challenge.tsx`, `two-factor/disable-two-factor-dialog.tsx`, `two-factor/regenerate-backup-codes-dialog.tsx`, `organization/*` not listed above, `admin/`, `username/`, `user/`, `last-login-method/`, etc.) is currently **pure upstream** — never patched, safe to overwrite wholesale on every upgrade.

## Architecture notes

### Redirect handling: one convention, `?redirectTo=`
Every producer/consumer of a post-auth redirect target uses the query param name `redirectTo` and `@better-auth-ui/core`'s `getSafeRedirectTo(redirectTo, origin)` (rejects cross-origin, `//`-prefixed, backslash, and control-character targets) / `getAuthLinkURL(href, redirectTo)`. There is no fallback-to-provider-default behavior for a missing param — `getSafeRedirectTo` always resolves to `"/"` if nothing valid was supplied.

### Two-factor: one page for mandatory and voluntary
`/account/two-factor` (`routes/_sessionOnly/account/two-factor.tsx`, rendering `two-factor/two-factor-setup.tsx`) is the **only** place `EnableTwoFactorDialog` renders standalone. Every path that needs enrollment routes here instead of opening the dialog inline:
- The app's own auth middleware — not-yet-enrolled + instance requires 2FA → redirect gate.
- `use-sign-in-continuation.ts` — same check, right after sign-in.
- `two-factor-settings.tsx`'s Enable/Reset buttons — voluntary, `navigate()`s here.

`mode`/`required` are computed inside `TwoFactorSetup` from the session (`user.twoFactorEnabled`) and `useConfigStatus().twoFactorRequired` — **never** from a URL param, so tampering with the query string can't make a mandatory dialog dismissible.

### `admin` and `username` plugins: installed, not registered
`../../lib/auth/admin-plugin.ts` (`StopImpersonating` menu item, `isImpersonatingSession(session)` type guard) and `username-plugin.ts` (username sign-in + field) exist and are pure upstream, but are **not** in either app's `providers.tsx` `plugins` array — inert until someone adds them.

**Naming gotcha**: each app's own `lib/auth/admin.ts` has its own `isImpersonatingSession` with a *different signature* — `isImpersonatingSession(impersonatedBy: string | null | undefined)`, vs. the plugin's `isImpersonatingSession(session)`. Both are imported by full path everywhere, so there's no accidental cross-call today, but don't assume they're interchangeable.

### Organization switcher: icon trigger lives in the app
`organization-switcher.tsx` only carries the separator patch listed above. The topbar's icon-only trigger (square org logo) is built in `src/components/layouts/UserMenu.tsx` and passed in through the switcher's `trigger` prop, so it survives re-fetches.

### Single `better-auth` instance
`pnpm-workspace.yaml`'s `overrides` pin `kysely` to `0.28.17`. It is a loose-range transitive peer of `better-auth`, and letting it float can fork `better-auth` (and `@better-auth-ui/core`/`react` above it) into multiple pnpm instances; `kysely@0.29.x` also violates `better-auth`'s own `<0.29` peer range. Check with `pnpm why @better-auth-ui/react`, which should report "Found 1 version".

### `accept-invitation.tsx` (added in 1.6.44)
Wired into `organization-plugin.tsx`'s `views.auth.acceptInvitation`. Renders at `/auth/accept-invitation?invitationId={id}`, requires an authenticated session (`useAuthenticate`), shows accept/reject for a pending, unexpired invitation. This is the **only** thing 1.6.44 added toward [#510](https://github.com/api7/api7ee-developer-portal/issues/510) — it does not touch `organization-invitations.tsx` (the admin-facing table), so [#511](https://github.com/api7/api7ee-developer-portal/issues/511)'s expired-state/resend/hide-cancelled asks are still unaddressed by upstream, and #510's landing-page-redirect-hides-pending-invitations issue is still an app-level bug, not something this upgrade fixed.

## Registry-managed vs. app-specific files

Registry-managed files are this directory plus, in `src/lib/auth/`, `*-plugin.ts(x)`, `use-sign-in-continuation.ts`, `use-resend-cooldown.ts`, `use-two-factor-password.ts`, `two-factor.ts`, `two-factor-methods.ts` and `pending-two-factor-password.ts`. Everything else in `src/lib/auth/` is app-specific and never touched by `shadcn add`:
- `check-email-policy.ts` — a TanStack `createServerFn`; injected into `<Auth checkEmailPolicy={...}>` instead.
- `client.ts` — the concrete `authClient` instance (app-specific `baseURL`).
- `permissions.ts`, `role.ts`, `organization.ts`, `email-policy.ts`, `admin.ts`, `admin.server.ts`, `platform-admin.server.ts`, `useApplicationPermission.ts`, `middleware.ts` — pure app business logic that happens to live in the same directory by convention, never touched by `shadcn add`.

`src/lib/compat/next-navigation.ts` and `next-link.tsx` are Vite aliases that let the vendored files (which still literally `import ... from "next/navigation"` / `"next/link"`, exactly as shipped by the registry) run unmodified under TanStack Router.
