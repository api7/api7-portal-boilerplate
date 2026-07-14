"use client"

import { authQueryKeys } from "@better-auth-ui/core"
import { useAuth, useListAccounts } from "@better-auth-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { type SyntheticEvent, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Field, FieldError } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { authClient as typedAuthClient } from "@/lib/auth/client"
import { BackupCodesDialog } from "./backup-codes-dialog"

export type TwoFactorPasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * "reset" behaves like "enable" (generates a new secret + backup codes)
   * but is offered while 2FA is already on — for accounts where disabling
   * isn't allowed but the user still needs to re-pair a new authenticator.
   */
  action: "enable" | "disable" | "reset"
}

export function TwoFactorPasswordDialog({
  open,
  onOpenChange,
  action
}: TwoFactorPasswordDialogProps) {
  const { basePaths, navigate } = useAuth()
  const queryClient = useQueryClient()

  const { data: accounts } = useListAccounts(typedAuthClient)
  const hasCredentialAccount =
    accounts?.some((account) => account.providerId === "credential") ?? false

  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | undefined>()
  const [isPending, setIsPending] = useState(false)

  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [totpURI, setTotpURI] = useState<string | null>(null)

  const handleClose = () => {
    onOpenChange(false)
    setPassword("")
    setPasswordError(undefined)
    setShowPassword(false)
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (hasCredentialAccount && !password) {
      setPasswordError("Password is required")
      return
    }

    setIsPending(true)
    try {
      if (action === "disable") {
        const { error } = await typedAuthClient.twoFactor.disable(
          password ? { password } : {}
        )
        if (error) {
          setPasswordError(error.message || "Incorrect password. Please try again.")
          setPassword("")
          return
        }
        toast.success("Two-factor authentication disabled.")
        handleClose()
        queryClient.invalidateQueries({ queryKey: authQueryKeys.session })
      } else {
        const { data, error } = await typedAuthClient.twoFactor.enable(
          password ? { password } : {}
        )
        if (error) {
          setPasswordError(error.message || "Incorrect password. Please try again.")
          setPassword("")
          return
        }
        handleClose()
        setBackupCodes(data?.backupCodes ?? [])
        setTotpURI(data?.totpURI ?? null)
        setTimeout(() => setShowBackupCodes(true), 250)
      }
    } catch (err) {
      setPassword("")
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      )
    } finally {
      setIsPending(false)
    }
  }

  const handleBackupCodesClose = () => {
    const twoFactorPath = `${basePaths.auth}/two-factor`
    navigate({
      to: totpURI ? `${twoFactorPath}?totpURI=${encodeURIComponent(totpURI)}` : twoFactorPath
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              {action === "disable" &&
                "Enter your password to disable two-factor authentication."}
              {action === "enable" &&
                "Enter your password to enable two-factor authentication."}
              {action === "reset" &&
                "Enter your password to reset two-factor authentication. You'll set up a new authenticator app and get new backup codes."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <Field data-invalid={!!passwordError}>
              <Label htmlFor="2fa-password">Password</Label>

              <InputGroup>
                <InputGroupInput
                  id="2fa-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordError(undefined)
                  }}
                  disabled={isPending}
                  required={hasCredentialAccount}
                  autoFocus
                  aria-invalid={!!passwordError}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isPending}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>

              <FieldError>{passwordError}</FieldError>
            </Field>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                {action === "disable" && "Disable Two-Factor"}
                {action === "enable" && "Enable Two-Factor"}
                {action === "reset" && "Reset Two-Factor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BackupCodesDialog
        open={showBackupCodes}
        onOpenChange={setShowBackupCodes}
        backupCodes={backupCodes}
        onClose={handleBackupCodesClose}
      />
    </>
  )
}
