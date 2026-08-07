"use client"

import { useAuth, useAuthPlugin, useSession } from "@better-auth-ui/react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PATH_ACCOUNT_SECURITY, PATH_ACCOUNT_TWO_FACTOR } from "@/constants/path-prefix"
import { useConfigStatus } from "@/lib/config/config-status-context"
import { twoFactorPlugin } from "@/lib/auth/two-factor-plugin"
import { cn } from "@/lib/utils"
import { DisableTwoFactorDialog } from "./disable-two-factor-dialog"
import { RegenerateBackupCodesDialog } from "./regenerate-backup-codes-dialog"

export type TwoFactorSettingsProps = {
  className?: string
}

/**
 * Security-settings card for enrolling in and managing two-factor auth.
 *
 * Reads `user.twoFactorEnabled` from the session — the field the Better Auth
 * two-factor plugin adds — so the card reflects enrollment without an extra
 * request.
 *
 * Enabling and resetting both hand off to the dedicated
 * `/account/two-factor` page (`TwoFactorSetup`) rather than opening
 * `EnableTwoFactorDialog` inline here — that page is the single place this
 * flow lives, whether reached voluntarily from this button or via the
 * mandatory-2FA redirect. Disabling and regenerating backup codes stay
 * inline since they're not part of that shared flow.
 *
 * @param className - Additional CSS classes applied to the card.
 */
export function TwoFactorSettings({ className }: TwoFactorSettingsProps) {
  const { authClient, navigate } = useAuth()
  const {
    backupCodes: backupCodesEnabled,
    localization: twoFactorLocalization
  } = useAuthPlugin(twoFactorPlugin)

  const { data: session, isPending } = useSession(authClient)
  const isEnabled = Boolean(
    (session?.user as { twoFactorEnabled?: boolean } | undefined)
      ?.twoFactorEnabled
  )

  const { twoFactorRequired } = useConfigStatus()
  const canDisable = !twoFactorRequired

  const [disableOpen, setDisableOpen] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)

  const action = !isEnabled ? "enable" : canDisable ? "disable" : "reset"

  const goToSetup = () =>
    navigate({
      to: `${PATH_ACCOUNT_TWO_FACTOR}?redirectTo=${encodeURIComponent(PATH_ACCOUNT_SECURITY)}`
    })

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-end justify-between gap-3">
        <h2 className="truncate text-sm font-semibold">
          {twoFactorLocalization.twoFactor}
        </h2>

        <Button
          className="shrink-0"
          size="sm"
          variant={action === "enable" ? "default" : "destructive"}
          disabled={isPending}
          onClick={() =>
            action === "disable" ? setDisableOpen(true) : goToSetup()
          }
        >
          {action === "enable" && twoFactorLocalization.enableTwoFactor}
          {action === "disable" && twoFactorLocalization.disableTwoFactor}
          {action === "reset" && "Reset two-factor"}
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          {isPending ? (
            <Skeleton className="h-5 w-48" />
          ) : (
            <p className="text-sm font-medium">
              {isEnabled
                ? twoFactorLocalization.twoFactorEnabled
                : twoFactorLocalization.twoFactorDisabled}
            </p>
          )}

          <p className="text-muted-foreground text-sm">
            {isEnabled && !canDisable
              ? "Two-factor authentication is required and can't be disabled."
              : twoFactorLocalization.twoFactorDescription}
          </p>

          {isEnabled && backupCodesEnabled && (
            <Button
              className="self-start"
              size="sm"
              variant="outline"
              onClick={() => setRegenerateOpen(true)}
            >
              {twoFactorLocalization.regenerateBackupCodes}
            </Button>
          )}
        </CardContent>
      </Card>

      {canDisable && (
        <DisableTwoFactorDialog
          open={disableOpen}
          onOpenChange={setDisableOpen}
        />
      )}
      <RegenerateBackupCodesDialog
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
      />
    </div>
  )
}
