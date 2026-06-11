"use client"

import { authQueryKeys } from "@better-auth-ui/core"
import { useAuth } from "@better-auth-ui/react"
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
  isTwoFactorEnabled: boolean
}

export function TwoFactorPasswordDialog({
  open,
  onOpenChange,
  isTwoFactorEnabled
}: TwoFactorPasswordDialogProps) {
  const { basePaths, navigate } = useAuth()
  const queryClient = useQueryClient()

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
    if (!password) {
      setPasswordError("Password is required")
      return
    }

    setIsPending(true)
    try {
      if (isTwoFactorEnabled) {
        await typedAuthClient.twoFactor.disable({ password })
        toast.success("Two-factor authentication disabled.")
        handleClose()
        queryClient.invalidateQueries({ queryKey: authQueryKeys.session })
      } else {
        const response = await typedAuthClient.twoFactor.enable({ password })
        handleClose()
        setBackupCodes(response.data?.backupCodes ?? [])
        setTotpURI(response.data?.totpURI ?? null)
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
              {isTwoFactorEnabled
                ? "Enter your password to disable two-factor authentication."
                : "Enter your password to enable two-factor authentication."}
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
                  required
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
                {isTwoFactorEnabled
                  ? "Disable Two-Factor"
                  : "Enable Two-Factor"}
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
