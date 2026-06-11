"use client"

import { useSession } from "@better-auth-ui/react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { authClient } from "@/lib/auth/client"
import { TwoFactorPasswordDialog } from "./two-factor-password-dialog"

export type TwoFactorCardProps = {
  className?: string
}

export function TwoFactorCard({ className }: TwoFactorCardProps) {
  const { data: session, isPending } = useSession(authClient)
  const isTwoFactorEnabled = !!(session?.user as { twoFactorEnabled?: boolean })
    ?.twoFactorEnabled

  const [showDialog, setShowDialog] = useState(false)

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3">Two-Factor</h2>

      <Card className={className}>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {isPending ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                <p className="text-sm font-medium leading-tight">
                  {isTwoFactorEnabled
                    ? "Two-factor authentication is enabled."
                    : "Two-factor authentication is not enabled."}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {isTwoFactorEnabled
                    ? "Your account is protected with an authenticator app."
                    : "Add an extra layer of security to your account."}
                </p>
              </>
            )}
          </div>

          <Button
            size="sm"
            variant={isTwoFactorEnabled ? "outline" : "default"}
            disabled={isPending}
            onClick={() => setShowDialog(true)}
          >
            {isTwoFactorEnabled ? "Disable Two-Factor" : "Enable Two-Factor"}
          </Button>
        </CardContent>
      </Card>

      <TwoFactorPasswordDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        isTwoFactorEnabled={isTwoFactorEnabled}
      />
    </div>
  )
}
