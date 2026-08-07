# better-auth-ui upgrade audit (1.6.31 → 1.6.43)

This directory is regenerated via `pnpm dlx shadcn add` from the
`@better-auth-ui` registry, which overwrites local files. The 1.6.31 → 1.6.43
bump wiped out several project-specific customizations that had been layered
on top of the registry components. This note tracks what was lost and what
was done about it.

**Status: all three areas below (sign-in/sign-up, organization, two-factor)
have been restored/migrated.** The tables are kept as a historical record —
each restored row says so — and, more importantly, as the list of spots that
will need re-patching again after the *next* `shadcn add`.

## Re-patch after every future `shadcn add` upgrade

These are edits to registry files that `shadcn add` will silently overwrite
again next time. Check this list first after any future upgrade — it saves
re-discovering the same regressions from scratch:

- `additional-field.tsx` and `invite-member-dialog.tsx`: `alignItemWithTrigger={false}` on `SelectContent` (team convention, see `ea0803e`).
- `two-factor-settings.tsx`: the `twoFactorRequired` gate (no "Disable" button, "Reset two-factor" instead) **and** the "Enable"/"Reset" buttons navigating to `/account/two-factor` instead of opening `EnableTwoFactorDialog` inline — without the latter, a regen would bring back a second, redundant enrollment code path on this page.
- `enable-two-factor-dialog.tsx`: the `mode?: "enable" | "reset"` prop and its copy overrides; the `required`/`onEnrolled` props and their snapshot-on-open handling; the resume-or-enroll `enroll()` function replacing the plain `useEnableTwoFactor` mutation. This file changed the most of anything in this migration — diff it in full against the registry version after any future upgrade, don't just skim for the props.
- `organization-switcher.tsx`: `authorized`/`size="icon"` props (see the organization table below) — the `setActive`-based tab-preserving behavior does *not* need re-patching, it lives in `UserMenu.tsx`.

## Lost customizations — sign-in / sign-up views (restored)

| File | What was lost | Original commit | Severity |
|---|---|---|---|
| `sign-in.tsx` | The two-phase sign-in flow: enter email first, look up the org's auth policy (`checkEmailPolicy`), then branch to SSO redirect, password, or magic link (`ssoProviderId`, `Back` button, `magicLinkSent` state). Replaced by upstream's single-phase email+password form. At the time, `check-email-policy.ts` had no caller — it's called again now, from the email-lookup phase. | `27f992d` feat: policy-based sso sign in (#427) | High |
| `sign-in.tsx` | Stashing the just-typed password (`stashTwoFactorPassword`) before redirecting to forced 2FA enrollment, so the user isn't asked for their password twice. At the time, `pending-two-factor-password.ts`'s `stashTwoFactorPassword` had no caller and `two-factor-view.tsx`'s `consumeTwoFactorPassword` never received a stashed value. Both are wired up again now — `use-sign-in-continuation.ts` stashes it, `enable-two-factor-dialog.tsx` consumes it (`two-factor-view.tsx` itself was later deleted; see the two-factor section below). | `27f992d` (#427) + `9b92699` feat: allow force two factor (#480) | High |
| `sign-in.tsx`, `provider-button.tsx` | Reading a query param (with open-redirect-safe URL parsing) as the post-login destination. New components only used `useAuth().redirectTo`. The param was still produced in several places (`src/lib/dal/util.ts`, `app/(public-controlled)/api-hub/[id]/page.tsx`), so, at the time, users bounced to sign-in from a protected page no longer landed back where they started. Restored, and later unified onto upstream's own `?redirectTo=`/`getSafeRedirectTo` convention rather than our own hand-rolled parser — see the redirect-handling section below. | `27f992d` (#427) | High |
| `provider-button.tsx` | The `signIn.oauth2` workaround for genericOAuth providers, needed because better-auth's genericOAuth plugin captures `ctx.baseURL=""` in a closure under `DynamicBaseURLConfig`, producing a relative `redirect_uri`. Also `loginHint` (prefills the IdP login form via `login_hint`). | `27f992d` (#427) | High |
| `sign-up.tsx`, `auth.tsx` | The `signUpConsentLabel` / TOS checkbox flow (`Checkbox` import, `tosAccepted` field validation, `dangerouslySetInnerHTML` rendering of the configured consent HTML). At the time, `AuthProps`/`SignUpProps` no longer declared `signUpConsentLabel` at all, while `app/(public)/auth/[path]/page.tsx` (untouched by the regen) still passed `signUpConsentLabel={app.signUpConsentLabel}` — a type error — and the TOS gate was gone. Both props declare it again now. | `c3fc1c9` feat: signup tos consent more flexible (#447) | High |
| `additional-field.tsx` | `alignItemWithTrigger={false}` on the `select` field's `SelectContent`. Team convention: every `SelectContent` must set this to avoid dropdown misalignment/overlap. | `ea0803e` fix: select dropdown overlap (#440) | Medium |

All six rows above are restored. One deliberate deviation from the old
implementation: `sign-in.tsx`'s magic-link entry point is no longer a
hand-rolled inline "Send login link" button — 1.6.43's `magicLinkPlugin` now
ships magic link as its own first-class view (`/auth/magic-link`), so the
credentials phase just links there instead of re-implementing it inline.
`stashTwoFactorPassword`/`pending-two-factor-password.ts` was **not**
resurrected in `sign-in.tsx` the way it originally worked — see the
two-factor section below for where that logic actually lives now
(`useSignInContinuation`, not the sign-in form itself).

## Lost customizations — organization components (`organization/`, restored)

A second regen (still 1.6.43, `organization/` subtree) wiped out a further
round of project-specific customizations layered on top of those registry
components.

| File | What was lost | Original commit | Severity |
|---|---|---|---|
| `organization-switcher.tsx` | The `authorized` prop (server component passes `true` to avoid a client-side session flash), the `size="icon"` icon-only trigger variant (`iconTrigger`, rendered via `OrganizationLogo`), the icon-only "manage/settings" buttons in the dropdown, and the `"Select organization"` placeholder text. Reverted to: buttons always show text, no icon-only trigger option. *(The "preserve current tab when switching orgs" part of this row was superseded, not lost — see the slug-based-routes section below.)* | `23c876e` feat: restructure api and page routes (#442) | High |
| ~~`organization-switcher.tsx` SSR-hydration optimization~~ | **Superseded, not lost — no action needed.** See "Organization plugin: slug-based routes" below: upstream's `useActiveOrganization` now natively fetches by `organizationSlug` when `organizationPlugin({ slug })` is configured, which is what this hand-rolled optimization was working around in 1.6.31. The 1.6.43 registry version reverting to a plain `useActiveOrganization()` call is correct, not a regression. | `ecf2606` feat: improve auth components ssr query hydration (#466) | ~~Medium-high~~ Resolved by upstream |
| `organization-profile.tsx` | Updating org settings used a direct `useMutation` (bypassing `MutationInvalidator`) so the redirect to the new slug's URL (`router.push('/${newSlug}/settings')`) fires immediately after the HTTP response. The original comment explains why: going through the standard invalidate-and-refetch path re-fetches with the now-stale old slug and retry-loops for ~7 seconds. Reverted to the generic `useUpdateOrganization` hook — **no more auto-redirect to the new slug URL after a rename**, and the ~7s stale-slug retry bug is likely back. | `23c876e` (#442) | High |
| `create-organization-dialog.tsx` | Hiding the slug input and auto-generating a random slug (`generateSlug()`) on org creation. Reverted to exposing the manual `<SlugField>` editor again. | `502a4ec` feat: hide slug input on create org dialog (#429) | High |
| `invite-member-dialog.tsx` | `alignItemWithTrigger={false}` on the role `SelectContent` — same team convention as `additional-field.tsx` above. | `ea0803e` fix: select dropdown overlap (#440) | Medium |
| `organization-members.tsx` | The `useHasPermission({ member: ["create"] })` check that disables "Invite Member" for members without permission. | Only ever seen in the original install commit `1a4eb93`, not in a later deliberate change. Restored — the file still had the sibling `update`/`delete` permission checks right above where this one used to sit, which reads as an accidental partial revert during the regen rather than an abandoned pattern. | Restored |

All rows above are restored, except the tab-preserving org-switch behavior,
which now lives in `src/components/layouts/UserMenu.tsx` via the `setActive`
prop instead of being patched into `organization-switcher.tsx` — see the
slug-based-routes section below.

Confirmed pure upstream changes in `organization/` (no action needed):
`slug-field.tsx` and the rest of `invite-member-dialog.tsx` (new `slugPrefix`
display, inline validation errors), `organization.tsx` (`Link`+render →
`onClick`+`navigate`, `slugPrefix` wiring), `organization-row.tsx` /
`organization-view.tsx` (`slugPrefix` wiring, `Item`/`ItemActions`
migration), `organization-logo.tsx`, `change-organization-logo.tsx`,
`organization-member-row.tsx`, `user/user-avatar.tsx` (Base UI API changes —
`AvatarFallback.delay` removed, `DropdownMenuTrigger` render-prop → className
+ onClick, same pattern as the first regen). `organizations.tsx`,
`organizations-empty.tsx`, `organization-invitations*.tsx`,
`user-invitations*.tsx` have never been customized since the initial
registry install, so their diffs are upstream-only.

## Organization plugin: slug-based routes — we should (and largely already did) migrate

Docs: https://better-auth-ui.com/docs/shadcn/plugins/organization#slug-based-routes

This is exactly the pattern our whole multi-tenancy model is built on (see
top-level `CLAUDE.md`: "the active organization is encoded in the URL, not
in server session state"). We built this by hand before upstream had it;
1.6.43's `organizationPlugin` now supports it natively. Answer: **yes,
migrate — and the `organization/` component regen already carried most of it
over automatically**, because `useActiveOrganization()` and the switcher
components read the `slug`/`slugPrefix` straight from
`useAuthPlugin(organizationPlugin)` rather than taking them as call
arguments.

### Already matching upstream's recommended setup
- `app/providers.tsx` already calls
  `organizationPlugin({ slug: activeOrgSlug ?? null, ... })` — `null` on
  non-org pages exactly as the docs prescribe (not `undefined`, which would
  leak session-based active-org state).
- Confirmed by reading `@better-auth-ui/react`'s
  `queries/organization/active-organization-query.ts`: `useActiveOrganization`
  now reads `slug` via `useAuthPlugin(organizationPlugin)` internally and
  queries `getFullOrganization({ query: { organizationSlug: slug } })`
  instead of the session's active org whenever a slug is configured. Every
  call site in `organization/` (`organization-switcher.tsx`,
  `organization.tsx`, `organization-profile.tsx`) already calls it with no
  arguments and gets this for free post-regen.
- `OrganizationSwitcher`/`OrganizationRow`'s `handleSetActive` already
  branches on `slug !== undefined` and calls `navigate()` to a
  slug-prefixed route instead of `setActiveOrganization()` — matching the
  docs' described switcher behavior verbatim.
- We don't use `slugPrefix` (no `@acme`-style display prefix), so the new
  `slugPrefix` wiring that showed up throughout the `organization/` regen is
  inert for us but harmless.

### What upstream's feature does *not* replace
- **`useOrganizationSlug()`** (`src/lib/hooks/useOrganizationSlug.ts`) — the
  docs' own example reads the slug via TanStack Router's
  `useParams({ strict: false })`; we're on Next.js App Router with a mixed
  route structure (`app/(auth)/[slug]/...` for org-scoped pages, but also
  slug-less pages like `app/(public-controlled)/api-hub` reached from
  components that render across both trees). `useOrganizationSlug()` parses
  `usePathname()` directly against `RESERVED_FIRST_SEGMENTS` so it works
  uniformly regardless of which route tree rendered the calling component —
  there's no upstream primitive for that, it's Next.js-routing-specific
  glue that has to stay.
- `RESERVED_FIRST_SEGMENTS` / `NON_ORG_PREFIX_ROUTE_SEGMENTS`
  (`src/constants/common.ts`) and the proxy route's `KNOWN_API_RESOURCES`
  disambiguation — same reasoning.
- `getDeveloperIdFromSession()` (`src/lib/dal/index.ts`) — server-side,
  built on Better Auth's core session API, unrelated to the better-auth-ui
  client plugin.

### The one real gap: "preserve current tab when switching orgs"
The `switchOrgHref` behavior lost in the `organization-switcher.tsx` regen
(swap only the slug segment of the current path instead of always landing on
`/{slug}/settings`) doesn't need to be patched into the registry file at
all. `OrganizationSwitcher` and `OrganizationRow` already expose a
`setActive?: (organization: Organization | null) => void` prop that, when
provided, fully replaces the internal `navigate()` call — this is
upstream's own sanctioned override point (the docs show the same pattern:
`setActive={(organization) => navigate({ to: ... })}`). The single call
site is `src/components/layouts/UserMenu.tsx:14`
(`<OrganizationSwitcher authorized hidePersonal size="icon" />`), a
project file the registry never touches. Recommended fix: pass a
`setActive` callback from there that reimplements `switchOrgHref` and
computes the target from the current pathname, instead of hand-editing
`organization-switcher.tsx` after every future `shadcn add`. The
`authorized` and `size="icon"` props, by contrast, changed the component's
*internal* rendering (trigger element, SSR session-flash guard) and can't be
recovered this way — those genuinely require re-patching the registry file
(tracked in the row above).

## Official `twoFactor` plugin: we are already running on it (unintentionally)

`@better-auth-ui/core` 1.6.43 ships a native `twoFactor` plugin
(`node_modules/@better-auth-ui/core/src/plugins/two-factor/`), which did not
exist in 1.6.31. Its registry components have now been installed side by
side with our old fully-custom implementation:

| Old (custom) | New (official registry) |
|---|---|
| `src/lib/auth/two-factor-plugin.tsx` | `src/lib/auth/two-factor-plugin.ts` |
| `two-factor/two-factor-card.tsx` | `two-factor/two-factor-settings.tsx` |
| `two-factor/two-factor-password-dialog.tsx` | `two-factor/enable-two-factor-dialog.tsx` + `disable-two-factor-dialog.tsx` |
| `two-factor/backup-codes-dialog.tsx` | `two-factor/backup-codes.tsx` + `regenerate-backup-codes-dialog.tsx` |
| `two-factor/two-factor-view.tsx` (challenge half) | `two-factor/two-factor-challenge.tsx` |
| `two-factor/two-factor-view.tsx` (forced-enrollment half) | `two-factor/enable-two-factor-dialog.tsx`, extended with `required`/`onEnrolled` (see below) — no separate page |
| `lib/auth/pending-two-factor-password.ts` | kept — repointed to `enable-two-factor-dialog.tsx` |

**This was not a hypothetical migration — it had already happened before
anyone touched a line of code.** Historical note, from when both files were
still on disk: `two-factor-plugin.ts` and `two-factor-plugin.tsx` briefly
lived in the same directory and exported the same `twoFactorPlugin` name,
and every import site (`app/providers.tsx` included) referenced it as
`@/lib/auth/two-factor-plugin` with no extension. Verified at the time via
`tsc --traceResolution`: every one of those imports resolved to the `.ts`
file, never the `.tsx` one — so the app was already rendering
`TwoFactorSettings`/`TwoFactorChallenge` from the official plugin before any
deliberate migration work started, and grep confirmed nothing outside the
dead `.tsx` file imported `TwoFactorCard`, `TwoFactorView`,
`TwoFactorPasswordDialog`, or the old `BackupCodesDialog`. That `.tsx` file
(and the rest of the dead set) has since been deleted for real — see the
file list below — so this import-resolution race is no longer live; it's
kept here only as the evidence trail for *why* deleting them was safe.
`pending-two-factor-password.ts` was dead too at the time of this
observation, but has since been kept and repointed to real callers as part
of rebuilding forced enrollment.

The official plugin's own id is `"twoFactor"` (camelCase), which is exactly
what `useSignInContinuation` looks up — so the plugin-id mismatch flagged in
the previous section is resolved by this migration, not by renaming our old
plugin.

### What the official plugin gains over our custom build
- Challenge view (`two-factor-challenge.tsx`) supports TOTP **and** email OTP
  (with resend cooldown) **and** backup-code entry, switchable inline — our
  old `two-factor-view.tsx` challenge form only did TOTP.
- `enable-two-factor-dialog.tsx` adds a manual setup-key copy fallback next
  to the QR code, and `backup-codes.tsx` adds download/print in addition to
  copy.
- `useTwoFactorPasswordRequirement` (`lib/auth/use-two-factor-password.ts`)
  is upstream's own version of our "does this account even have a password
  to confirm" check, driven by the plugin's `allowPasswordless` option.

### The mandatory/"force 2FA" instance policy — was gone, now rebuilt
Our custom build had one feature the official plugin has no concept of at
all: `auth.twoFactor.required` (**instance-wide** mandatory 2FA — not a
per-org policy, despite the earlier phrasing in this doc — surfaced
client-side as `useConfigStatus().twoFactorRequired`). Two behaviors
depended on it and were both unwired by the regen; both are now rebuilt:

1. **Settings card gating** — `two-factor-settings.tsx` now reads
   `useConfigStatus().twoFactorRequired` and, when the account is enrolled
   and 2FA is required, shows **"Reset two-factor"** instead of "Disable"
   and never opens `DisableTwoFactorDialog`.
2. **Forced enrollment** — a single dedicated page,
   `/account/two-factor` (`app/(session-only)/account/two-factor/page.tsx`
   + `src/components/auth/two-factor/two-factor-setup.tsx`), that renders
   nothing but `EnableTwoFactorDialog` itself. See below.

**Design went through two revisions before landing here — both are worth
knowing about if this needs touching again:**
1. First attempt built a whole separate page with its own hand-rolled
   password/verify/backup-codes UI, duplicating what
   `enable-two-factor-dialog.tsx` already does, and named it
   `/two-factor-required` — which broadcasts "this instance mandates 2FA"
   to anyone who notices the redirect, independent of the architecture
   question.
2. Second attempt reused `/account/security` directly: `two-factor-settings.tsx`
   auto-opened `EnableTwoFactorDialog` inline on that page. This fixed the
   duplication and the naming problem, but the *voluntary* enable/reset flow
   (clicking the button on the security page) still had its own separate
   inline-dialog code path from the *mandatory* flow, and the underlying
   Better Auth UI convention is that 2FA setup is dialog-only to begin with
   — there's no `viewPaths` entry for enrollment anywhere in the plugin, so
   tying it to a specific settings page was an unnecessary constraint of
   our own making.

**Current design**: one page, `/account/two-factor`, used by *every* path
that needs this dialog — mandatory and voluntary alike:
- `proxy.ts`'s redirect (not yet enrolled, instance requires it).
- `useSignInContinuation` (freshly signed in, not yet enrolled, instance requires it).
- `two-factor-settings.tsx`'s "Enable"/"Reset" buttons (voluntary), which
  now just `navigate()` here with `?redirectTo=/account/security` instead of
  opening `EnableTwoFactorDialog` inline.

`mode` (`"enable"` vs `"reset"`) and `required` are computed inside
`TwoFactorSetup` from the actual session (`user.twoFactorEnabled`) and
config (`useConfigStatus().twoFactorRequired`) — **never** from the URL.
The only query param is `?redirectTo=`, resolved server-side via upstream's
`getSafeRedirectTo(redirectParam, app.baseURL)` (`@better-auth-ui/core`) —
see "Redirect handling: unified onto upstream's own convention" below — and
it only affects where the user lands after cancelling or finishing;
tampering with it cannot make a mandatory dialog dismissible, since
`required` isn't derived from it at all.

### Discovery made during implementation: `apps/site/proxy.ts` already had a gate here
Not caught by the original component-diff audit because it lives outside
`src/components/auth/` and wasn't touched by any regen. `proxy.ts` (Next's
edge middleware) already redirected signed-in, not-yet-enrolled users
somewhere whenever `auth.twoFactor.required` is on — originally to
`` `${PATH_TWO_FACTOR}?redirect=...` `` (`/auth/two-factor`), which now
belongs to the official `TwoFactorChallenge` component and assumes a
mid-sign-in challenge already in flight (reads `sessionStorage`, expects an
enrolled account) — every verify attempt there was guaranteed to fail for a
fresh account. This means a redirect gate never needed to be added to
`(auth)/layout.tsx` from scratch as originally planned — one already
existed, just pointed at the wrong place. Retargeted at
`PATH_ACCOUNT_TWO_FACTOR` (`/account/two-factor`, `src/constants/path-prefix.ts`)
instead. `PATH_ACCOUNT` (broad `/account` prefix) was already in
`TWO_FACTOR_EXEMPT_PREFIXES`, so `/account/two-factor` is covered without
a separate entry, and no redirect-loop risk.

### How the dialog itself works (`enable-two-factor-dialog.tsx`)
- **Password reuse, zero prompts**: `useSignInContinuation`
  (`src/lib/auth/use-sign-in-continuation.ts`) checks
  `useConfigStatus().twoFactorRequired` right after a successful sign-in
  with no `twoFactorRedirect`. If required and the user isn't enrolled, it
  calls `stashTwoFactorPassword` (the *kept*, not deleted,
  `pending-two-factor-password.ts`) and navigates straight to
  `/account/two-factor?redirectTo=<target>` — client-side, before `proxy.ts`
  would even get a chance to catch it on the next request. The dialog
  consumes that stash as soon as it opens and enrolls with zero password
  prompts. Reaching the page any other way (e.g. via `proxy.ts`, on an
  existing session with nothing stashed) falls back to an inline password
  field.
- **Resume-or-enroll**: the dialog's `enroll()` tries `twoFactor.getTotpUri()`
  first and only falls back to `twoFactor.enable()` on `TOTP_NOT_ENABLED` —
  ported from the old `two-factor-view.tsx` (now deleted) — so reloading
  mid-setup resumes the same secret instead of silently minting a new one
  and invalidating an already-scanned QR code. This replaced the plain
  `useEnableTwoFactor` mutation the dialog used before, so **every** enable
  flow gets resume-safety now, not just the mandatory one.
- **`required`/`onEnrolled` props**: when `required`, the dialog hides
  Cancel and the header close button and refuses to close via
  `onOpenChange` until `verifyTotp` actually succeeds. `onEnrolled`, if
  given, is called when backup codes are acknowledged instead of just
  closing the dialog — `TwoFactorSetup` always passes one, wired to
  `navigate({ to: redirectTo })` (the prop is required now, not optional —
  the page always resolves a value via `getSafeRedirectTo` before rendering
  it, so there's nothing left to fall back to).
- **Snapshot-on-open, not live props**: `required`/`onEnrolled` get
  captured into a ref/state pair the moment the dialog transitions open,
  not read live throughout. This mattered more in the previous
  `/account/security`-embedded design (the parent's `mustEnroll` could flip
  `false` mid-flow the instant the session query refetched after
  `verifyTotp` succeeded, before the user had even seen backup codes) and
  is lower-stakes now that this page's own `required`/`mode` are stable for
  the page's lifetime — kept anyway since it's still technically possible
  for the session query to refetch mid-dialog. Resuming an interrupted
  setup has a related edge case: if `verifyTotp` succeeds on a resumed
  session with no fresh backup codes to show (`backupCodes.length === 0`),
  the dialog skips the backup-codes step and finishes immediately rather
  than rendering an empty one.

Deleted now-dead files: `two-factor-plugin.tsx`, `two-factor-card.tsx`,
`two-factor-view.tsx`, `two-factor-password-dialog.tsx`,
`backup-codes-dialog.tsx`. **Not** deleted:
`lib/auth/pending-two-factor-password.ts` — still has two real callers
(`use-sign-in-continuation.ts` and `enable-two-factor-dialog.tsx`).

### e2e spec was substantially rewritten, not just re-run
`auth-two-factor-required.spec.ts` predated this migration and hardcoded
`/auth/two-factor` as the forced-enrollment URL with a
backup-codes-then-verify step order — both specific to the old
single-component, URL-param-driven design. It now asserts against
`/account/two-factor` (and, for the settings-triggered reset case, the
`?redirectTo=` bounce back to `/account/security`) with a uniform
password → verify → backup-codes order via `dialogContent()` throughout,
while preserving every behavioral guarantee the original test encoded:
zero-prompt password reuse, inline-prompt fallback, resume-same-secret on
reload, no "Disable" button and no "Cancel" button when required, "Reset
two-factor" copy, and reset minting a genuinely new secret without
disabling. **This has been type-checked
(`cd apps/site-e2e && npx tsc --noEmit -p tsconfig.json`, no new errors)
and lint-checked, but not run against a live devportal instance in this
session** — run `pnpm e2e auth-two-factor-required` for real confirmation
before treating this as verified.

### Minor edge case worth knowing about (currently not triggered)
`useTwoFactorPasswordRequirement` treats a *failed* `useListAccounts` query
the same as "no credential account" — i.e. if `allowPasswordless: true` is
ever configured, an account-lookup error would silently skip the password
prompt instead of erring on the side of asking for it (this is the same bug
class our `3defd1f fix: guard 2fa enrollment on account lookup error (#499)`
fixed in the old code). Not an active bug today because the plugin is
instantiated with no options (`twoFactorPlugin()` in `app/providers.tsx`),
so `allowPasswordless` defaults to `false` and password is always required —
but worth re-checking if that option is ever turned on.

## Redirect handling: unified onto upstream's own convention

Restoring `?redirect=` handling (sign-in/sign-up section above) and building
`/account/two-factor` (previous section) each grew their own small
same-origin-redirect validator, landing on two different query param names
(`redirect` for our own hand-rolled bits, `redirectTo` for upstream's own
`TwoFactorChallenge`/`getAuthRedirectAction`). A closer look at
`src/components/auth/auth-redirect.tsx` (the `/auth/redirect` view, never
audited before since nothing in the original component-diff pointed at it)
turned up why that inconsistency didn't need to exist: `@better-auth-ui/core`
already exports `getSafeRedirectTo(redirectTo, origin)` — stricter than what
we'd hand-rolled (explicit rejection of backslashes, control characters, and
`//`-prefixed protocol-relative values, plus an actual origin-equality check
rather than just discarding the host) — and `getAuthLinkURL(href, redirectTo)`
for building links that carry it, which `sign-up.tsx`/`reset-password.tsx`
were already using.

**Changed**: deleted `src/lib/auth/safe-redirect.ts` (`parseSafeRedirect`)
entirely and switched every producer/consumer to `redirectTo` +
`getSafeRedirectTo`:
- Consumers — `sign-in.tsx`, `provider-button.tsx`,
  `app/(session-only)/account/two-factor/page.tsx` — now call
  `getSafeRedirectTo(searchParams.get("redirectTo"), baseURL)` (client
  components pass `useAuth().baseURL`; the two-factor page, a server
  component with no `useAuth()`, passes `getConfig().app.baseURL` instead).
- Producers — `src/lib/dal/util.ts`, `app/(public-controlled)/api-hub/[id]/page.tsx`,
  `apps/site/proxy.ts`, `use-sign-in-continuation.ts`,
  `two-factor-settings.tsx` — all build `?redirectTo=` now instead of
  `?redirect=`.

**Deliberately not preserved**: `getSafeRedirectTo` always returns a string
(falls back to `"/"` for missing/invalid input; it never returns `null`
the way `parseSafeRedirect` did). The old consumers used that `null` to fall
through to the provider's configured default `redirectTo` when no query
param was present at all. That distinction is gone on purpose — landing on
`"/"` when nothing was requested is upstream's own behavior (`getAuthRedirectAction`
does the same unconditional resolve-or-`"/"`), and the ask here was
specifically "no behavior beyond upstream's," not preserving a fallback we'd
invented ourselves.

## Official `admin` plugin: small overlap, most of our admin console has no equivalent

Newly installed: `src/lib/auth/admin-plugin.ts` and
`src/components/auth/admin/stop-impersonating.tsx`. Unlike the two-factor
plugin, there's **no filename collision** here — our existing
`src/lib/auth/admin.ts`, `admin.server.ts`, and `platform-admin.server.ts`
all have different basenames from `admin-plugin.ts`, so nothing silently
swapped implementations.

### What the plugin actually is
`@better-auth-ui/core`'s `admin` plugin is tiny: plugin id `"admin"`,
localization strings, the type guard
`isImpersonatingSession(session)` (checks `session.session.impersonatedBy`),
and exactly one React hook, `useStopImpersonating()`. That's the whole
surface — no user table, no ban/unban UI, no role management, no
impersonate-*trigger* button. `stop-impersonating.tsx` wires that hook into
a single `DropdownMenuItem` registered via `userMenuItems`, shown in the
user-button dropdown only while the current session is impersonating.

### Naming gotcha (not a collision, but easy to mix up)
We already have our own `isImpersonatingSession` in `lib/auth/admin.ts`,
with a **different signature** — it takes the raw `impersonatedBy: string |
null | undefined` value, not the whole session object:
```ts
// ours: lib/auth/admin.ts
isImpersonatingSession(session.session.impersonatedBy)
// upstream: @better-auth-ui/core/plugins
isImpersonatingSession(session)
```
Both are imported by their full path everywhere they're used today, so
there's no accidental cross-call, but the identical name is worth flagging
for anyone skimming the code later.

### Not wired up yet
`adminPlugin` is **not** in `app/providers.tsx`'s `plugins` array (only
`organizationPlugin`, and conditionally `magicLinkPlugin` /
`twoFactorPlugin`, are pushed there). So right now the plugin's files exist
but are inert — `StopImpersonating` won't render anywhere until it's
registered.

### We already have a richer version of the one thing this plugin does
`src/components/layouts/ImpersonationBanner.tsx` is a sticky, server-rendered
banner (mounted in `MainLayout` and the docs-public layout) that shows the
impersonated org name + user email and exits via an `auth.api.stopImpersonating`
server action, then redirects to `/admin/organizations`. The plugin's
`StopImpersonating` is a single, easy-to-miss dropdown item buried in the
user-button menu, and its `useStopImpersonating()` call doesn't redirect
anywhere afterward. If `adminPlugin` gets registered, decide deliberately
whether the extra exit point is worth the redundant/inconsistent UX (two ways
to stop impersonating, only one of which sends you back to the admin
console) — it isn't required for anything to keep working.

### No equivalent for the rest of our admin console
`app/admin/users`, `app/admin/organizations`, `UserTable`, `OrganizationTable`,
and the `adminUserIds`-or-`role:"admin"` platform-admin gate in
`admin.server.ts` / `platform-admin.server.ts` are entirely bespoke, DB- and
config-driven features. The official plugin has nothing to migrate them to —
there's no upstream user-management table or impersonate-trigger UI at all.

## Changes confirmed as pure upstream improvements (no action needed)

`auth-provider.tsx`, `error-toaster.tsx`, `provider-buttons.tsx`,
`forgot-password.tsx`, `reset-password.tsx` — diffed against git history and
found to be additive upstream changes (one-tap support, the new
reset-link-sent flow, richer inline validation messages, etc.) with no
evidence of removed project code.
