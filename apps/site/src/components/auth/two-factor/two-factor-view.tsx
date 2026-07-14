"use client"

import { useAuth, useListAccounts, useSession } from "@better-auth-ui/react"
import { Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { type SyntheticEvent, useCallback, useEffect, useRef, useState } from "react"
import QRCode from "react-qr-code"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { authClient as typedAuthClient } from "@/lib/auth/client"
import { consumeTwoFactorPassword } from "@/lib/auth/pending-two-factor-password"
import { BackupCodesDialog } from "./backup-codes-dialog"

export type TwoFactorViewProps = {
  className?: string
}

export function TwoFactorView({ className }: TwoFactorViewProps) {
  const { navigate, redirectTo, basePaths } = useAuth()
  const searchParams = useSearchParams()
  const totpURI = searchParams.get("totpURI")
  const redirectParam = searchParams.get("redirect")
  const verifiedRedirectTo = redirectParam ?? redirectTo

  const { data: session, isPending: isSessionPending } = useSession(typedAuthClient)
  const { data: accounts, isPending: isAccountsPending } = useListAccounts(typedAuthClient)

  const isTwoFactorEnabled = !!(session?.user as { twoFactorEnabled?: boolean } | undefined)
    ?.twoFactorEnabled

  // Forced enrollment: a full session already exists (unlike the mid-sign-in
  // OTP challenge below, which has no session until verifyTotp succeeds), the
  // user hasn't enabled 2FA yet, and there's no totpURI to display yet.
  const isForcedEnrollment =
    !totpURI && !isSessionPending && !!session && !isTwoFactorEnabled

  const hasCredentialAccount =
    accounts?.some((account) => account.providerId === "credential") ?? false

  const [needsPasswordPrompt, setNeedsPasswordPrompt] = useState(false)
  const [enrollPassword, setEnrollPassword] = useState("")
  const [enrollPasswordError, setEnrollPasswordError] = useState<string | undefined>()
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [pendingBackupCodes, setPendingBackupCodes] = useState<string[]>([])
  const [pendingTotpURI, setPendingTotpURI] = useState<string | null>(null)
  const autoEnrollAttempted = useRef(false)

  const commitTotpURI = useCallback(
    (uri: string) => {
      const params = new URLSearchParams({ totpURI: uri })
      if (redirectParam) params.set("redirect", redirectParam)
      navigate({ to: `${basePaths.auth}/two-factor?${params.toString()}`, replace: true })
    },
    [navigate, basePaths.auth, redirectParam]
  )

  const handleEnrollError = useCallback(
    (error: { message?: string; code?: string }, password: string | undefined) => {
      if (password) {
        setEnrollPasswordError(error.message || "Incorrect password. Please try again.")
        setNeedsPasswordPrompt(true)
      } else {
        toast.error(error.message || "Something went wrong. Please try again.")
      }
    },
    []
  )

  // Resume-or-enroll: a prior visit may have already created (and persisted)
  // a TOTP secret without the user finishing verification. Calling enable()
  // again would silently delete that secret and mint a new one, invalidating
  // any QR code already scanned. getTotpUri() re-derives the URI for the
  // existing secret without touching it, and only errors with
  // TOTP_NOT_ENABLED when there's truly nothing enrolled yet — only then do
  // we fall back to enable() to create the initial secret + backup codes.
  const enroll = useCallback(
    async (password?: string) => {
      setIsEnrolling(true)
      setEnrollPasswordError(undefined)
      try {
        const { data: resumeData, error: resumeError } =
          await typedAuthClient.twoFactor.getTotpUri(password ? { password } : {})
        if (!resumeError) {
          setNeedsPasswordPrompt(false)
          if (resumeData?.totpURI) commitTotpURI(resumeData.totpURI)
          return
        }
        if (resumeError.code !== "TOTP_NOT_ENABLED") {
          handleEnrollError(resumeError, password)
          return
        }

        const { data, error } = await typedAuthClient.twoFactor.enable(
          password ? { password } : {}
        )
        if (error) {
          handleEnrollError(error, password)
          return
        }
        setPendingBackupCodes(data?.backupCodes ?? [])
        setPendingTotpURI(data?.totpURI ?? null)
        setShowBackupCodes(true)
        setNeedsPasswordPrompt(false)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        )
      } finally {
        setIsEnrolling(false)
      }
    },
    [commitTotpURI, handleEnrollError]
  )

  useEffect(() => {
    if (!isForcedEnrollment || isAccountsPending || autoEnrollAttempted.current) return

    const stashedPassword = consumeTwoFactorPassword()
    if (stashedPassword) {
      autoEnrollAttempted.current = true
      // Deferred so the resulting setState calls land in their own task
      // instead of running synchronously inside this effect.
      queueMicrotask(() => enroll(stashedPassword))
    } else if (!hasCredentialAccount) {
      autoEnrollAttempted.current = true
      queueMicrotask(() => enroll())
    } else {
      queueMicrotask(() => setNeedsPasswordPrompt(true))
    }
  }, [isForcedEnrollment, isAccountsPending, hasCredentialAccount, enroll])

  const handleBackupCodesAcknowledged = () => {
    setShowBackupCodes(false)
    if (pendingTotpURI) commitTotpURI(pendingTotpURI)
  }

  const handlePasswordSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!enrollPassword) {
      setEnrollPasswordError("Password is required")
      return
    }
    enroll(enrollPassword)
  }

  const [code, setCode] = useState("")
  const [trustDevice, setTrustDevice] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const submit = useCallback(
    async (submitCode: string) => {
      if (submitCode.length < 6 || isPending) return

      setIsPending(true)
      try {
        const { error } = await typedAuthClient.twoFactor.verifyTotp({
          code: submitCode,
          trustDevice
        })
        if (error) {
          toast.error(error.message || "Invalid code. Please try again.")
          setCode("")
          return
        }
        navigate({ to: verifiedRedirectTo })
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Invalid code. Please try again."
        )
        setCode("")
      } finally {
        setIsPending(false)
      }
    },
    [isPending, trustDevice, navigate, verifiedRedirectTo]
  )

  const handleOtpChange = (value: string) => {
    setCode(value)
  }

  if (!totpURI && isForcedEnrollment && needsPasswordPrompt) {
    return (
      <Card className={cn("w-full max-w-sm", className)}>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Two-Factor Authentication Required
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-6">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication is required. Enter your password to
              begin setup.
            </p>

            <Field data-invalid={!!enrollPasswordError}>
              <Label htmlFor="enroll-password">Password</Label>
              <Input
                id="enroll-password"
                type="password"
                autoComplete="current-password"
                value={enrollPassword}
                onChange={(e) => {
                  setEnrollPassword(e.target.value)
                  setEnrollPasswordError(undefined)
                }}
                disabled={isEnrolling}
                required
                autoFocus
                aria-invalid={!!enrollPasswordError}
              />
              <FieldError>{enrollPasswordError}</FieldError>
            </Field>

            <Button type="submit" disabled={isEnrolling}>
              {isEnrolling && <Loader2 className="animate-spin" />}
              Continue
            </Button>
          </form>
        </CardContent>

        <BackupCodesDialog
          open={showBackupCodes}
          onOpenChange={(open) => {
            if (open) setShowBackupCodes(true)
          }}
          backupCodes={pendingBackupCodes}
          onClose={handleBackupCodesAcknowledged}
        />
      </Card>
    )
  }

  if (!totpURI && (isSessionPending || (isForcedEnrollment && !needsPasswordPrompt))) {
    return (
      <Card className={cn("w-full max-w-sm", className)}>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="animate-spin text-muted-foreground" />
          <Skeleton className="h-4 w-48" />
        </CardContent>

        <BackupCodesDialog
          open={showBackupCodes}
          onOpenChange={(open) => {
            if (open) setShowBackupCodes(true)
          }}
          backupCodes={pendingBackupCodes}
          onClose={handleBackupCodesAcknowledged}
        />
      </Card>
    )
  }

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Two-Factor Authentication
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(code)
          }}
          className="flex flex-col gap-6"
        >
          {totpURI ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code with your authenticator app, then enter the
                6-digit code below.
              </p>
              <QRCode
                className="border p-2 rounded-md"
                value={totpURI}
                size={160}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Enter the 6-digit code from your authenticator app.
            </p>
          )}

          <div className="flex flex-col items-center gap-2">
            <Label htmlFor="otp-code">One-Time Password</Label>
            <Input
              id="otp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => handleOtpChange(e.target.value.replace(/\D/g, ""))}
              disabled={isPending}
              className="w-40 text-center text-2xl font-mono tracking-[0.5em] pl-[0.5em]"
              autoFocus
            />
          </div>

          {!totpURI && (
            <div className="flex flex-row items-center gap-3">
              <Checkbox
                id="trustDevice"
                checked={trustDevice}
                onCheckedChange={(checked) => setTrustDevice(checked === true)}
                disabled={isPending}
              />
              <Label
                htmlFor="trustDevice"
                className="cursor-pointer font-normal"
              >
                Trust this device
              </Label>
            </div>
          )}

          <Button type="submit" disabled={isPending || code.length < 6}>
            {isPending && <Loader2 className="animate-spin" />}
            Verify
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
