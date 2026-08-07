"use client"

import { useAuth, useSession } from "@better-auth-ui/react"
import { useState } from "react"

import { useConfigStatus } from "@/lib/config/config-status-context"
import { EnableTwoFactorDialog } from "./enable-two-factor-dialog"

export type TwoFactorSetupProps = {
  /**
   * Where to send the user once the dialog closes, either way. Already
   * resolved through `getSafeRedirectTo` by the page — always a valid
   * same-origin target (falls back to `"/"`, upstream's own default; no
   * extra fallback layered on top here).
   */
  redirectTo: string
}

/**
 * Single canonical entry point for enabling/resetting two-factor auth.
 *
 * Renders nothing but the `EnableTwoFactorDialog` itself — there's no page
 * content behind it. `mode` and `required` are derived from the actual
 * session and instance config, never from the URL: only `redirectTo` (the
 * `?redirectTo=` the caller navigated here with) comes from outside, and it
 * only affects where the user lands afterward, not whether the dialog can
 * be dismissed.
 *
 * Reached three ways, all landing here instead of each maintaining their
 * own copy of this flow:
 * - `proxy.ts`'s mandatory-2FA redirect (not yet enrolled, instance requires it).
 * - `useSignInContinuation` routing a freshly signed-in, not-yet-enrolled user here directly.
 * - `TwoFactorSettings`'s "Enable"/"Reset" buttons, for voluntary (re)enrollment.
 */
export function TwoFactorSetup({ redirectTo: target }: TwoFactorSetupProps) {
  const { authClient, navigate } = useAuth()
  const { data: session, isPending } = useSession(authClient)
  const { twoFactorRequired } = useConfigStatus()

  const isEnabled = Boolean(
    (session?.user as { twoFactorEnabled?: boolean } | undefined)
      ?.twoFactorEnabled
  )
  const required = twoFactorRequired && !isEnabled
  const mode = isEnabled ? "reset" : "enable"

  const [dismissed, setDismissed] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setDismissed(true)
      navigate({ to: target })
    }
  }

  return (
    <EnableTwoFactorDialog
      open={!isPending && !dismissed}
      onOpenChange={handleOpenChange}
      mode={mode}
      required={required}
      onEnrolled={() => navigate({ to: target })}
    />
  )
}
