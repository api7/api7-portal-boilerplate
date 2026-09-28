"use client"

import { useAuth } from "@better-auth-ui/react"
import { useCallback } from "react"

import { useConfigStatus } from "@/lib/config/config-status-context"
import { isTwoFactorEnabled, type UserWithTwoFactor } from "./two-factor"
import { stashTwoFactorPassword } from "./pending-two-factor-password"
import {
  isTwoFactorRedirect,
  storeTwoFactorMethods,
  TWO_FACTOR_PLUGIN_ID
} from "./two-factor-methods"

/**
 * Resolve what happens after a sign-in request succeeds.
 *
 * Better Auth withholds the session when a second factor is required and
 * answers with `{ twoFactorRedirect: true, twoFactorMethods }` instead, so no
 * sign-in strategy may navigate to `redirectTo` unconditionally. This hook is
 * the single place that decision lives — every password-based form calls it
 * from `onSuccess`.
 *
 * The enabled methods are stashed in session storage (names only, never a
 * code or token) and `redirectTo` rides along in the query string so the
 * challenge view can finish the original navigation.
 *
 * The two-factor plugin is looked up by its stable id, so sign-in forms stay
 * installable without either the two-factor components or a matching release
 * of `@better-auth-ui/core`.
 *
 * When 2FA is instance-wide mandatory (`auth.twoFactor.required`) and the
 * just-signed-in user hasn't enrolled yet, this routes straight to
 * `/account/two-factor` (`TwoFactorSetup`, the dialog-only enrollment page)
 * instead of `redirectTo` — the app's own auth middleware would catch this on
 * the *next* request anyway, but deciding it here avoids that extra round
 * trip and lets the just-typed password be handed off via
 * `stashTwoFactorPassword` so the dialog doesn't have to ask again.
 *
 * @returns A callback taking the resolved data of a sign-in mutation and,
 *   optionally, the password that was just submitted.
 */
export function useSignInContinuation() {
  const { basePaths, navigate, plugins, redirectTo } = useAuth()
  const { twoFactorRequired } = useConfigStatus()

  const twoFactorPlugin = plugins.find(
    (plugin) => plugin.id === TWO_FACTOR_PLUGIN_ID
  )
  const twoFactorPath = twoFactorPlugin?.viewPaths?.auth?.twoFactor
  // `paths` is our own addition to `twoFactorPlugin`'s returned shape (see
  // `two-factor-plugin.ts`), not part of upstream's own plugin type.
  const accountTwoFactorPath =
    (twoFactorPlugin as { paths?: { setup?: string } } | undefined)?.paths
      ?.setup ?? "/account/two-factor"

  return useCallback(
    (data: unknown, password?: string) => {
      if (twoFactorPath && isTwoFactorRedirect(data)) {
        storeTwoFactorMethods(data.twoFactorMethods)

        navigate({
          to: `${basePaths.auth}/${twoFactorPath}?redirectTo=${encodeURIComponent(redirectTo)}`
        })
        return
      }

      const user = (data as { user?: UserWithTwoFactor } | null | undefined)
        ?.user

      if (twoFactorRequired && !isTwoFactorEnabled(user)) {
        if (password) stashTwoFactorPassword(password)

        navigate({
          to: `${accountTwoFactorPath}?redirectTo=${encodeURIComponent(redirectTo)}`
        })
        return
      }

      navigate({ to: redirectTo })
    },
    [
      accountTwoFactorPath,
      basePaths.auth,
      navigate,
      redirectTo,
      twoFactorPath,
      twoFactorRequired
    ]
  )
}
