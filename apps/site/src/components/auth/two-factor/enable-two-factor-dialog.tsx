"use client"

import { createQrCodeSvgData } from "@better-auth-ui/core"
import {
  type TwoFactorAuthClient,
  useAuth,
  useAuthPlugin,
  useVerifyTotp
} from "@better-auth-ui/react"
import { Check, Copy, ShieldCheck } from "lucide-react"
import {
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { consumeTwoFactorPassword } from "@/lib/auth/pending-two-factor-password"
import { twoFactorPlugin } from "@/lib/auth/two-factor-plugin"
import { useTwoFactorPasswordRequirement } from "@/lib/auth/use-two-factor-password"
import { OtpField } from "../otp-field"
import { BackupCodes } from "./backup-codes"

type EnrollmentStep = "password" | "verify" | "backupCodes"

export type EnableTwoFactorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * `"reset"` relabels the dialog for re-enrolling an account that's already
   * enrolled but can't be disabled (mandatory 2FA) — same enroll flow, just
   * different copy so it doesn't read like "enable" on an already-enabled
   * account.
   * @default "enable"
   */
  mode?: "enable" | "reset"
  /**
   * Mandatory enrollment: hides Cancel and blocks closing until enrollment
   * finishes. Also consumes a password stashed by `useSignInContinuation`
   * (if present) to auto-enroll without asking again, and auto-enrolls
   * immediately for passwordless accounts.
   */
  required?: boolean
  /** Called once backup codes are acknowledged, instead of just closing. */
  onEnrolled?: () => void
}

/**
 * Three-step two-factor enrollment: confirm the password, scan the QR code
 * and verify a first code, then save the backup codes.
 *
 * Enrollment uses resume-or-enroll: a prior visit may have already created
 * (and persisted) a TOTP secret without finishing verification. Calling
 * `enable()` again would silently mint a new secret and invalidate any QR
 * code already scanned, so `getTotpUri()` is tried first and only falls
 * back to `enable()` when nothing is enrolled yet (`TOTP_NOT_ENABLED`).
 *
 * @param open - Whether the dialog is open.
 * @param onOpenChange - Called when the dialog requests an open state change.
 * @param mode - `"reset"` for re-enrolling an already-enrolled, mandatory account.
 * @param required - Mandatory enrollment — see type doc.
 * @param onEnrolled - Called once backup codes are acknowledged.
 */
export function EnableTwoFactorDialog({
  open,
  onOpenChange,
  mode = "enable",
  required = false,
  onEnrolled
}: EnableTwoFactorDialogProps) {
  const { authClient, localization } = useAuth()
  const { codeLength, localization: twoFactorLocalization } =
    useAuthPlugin(twoFactorPlugin)
  const { isPending: isResolvingPasswordRequirement, requiresPassword } =
    useTwoFactorPasswordRequirement()

  const twoFactorClient = authClient as TwoFactorAuthClient

  const [step, setStep] = useState<EnrollmentStep>("password")
  const [totpUri, setTotpUri] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [code, setCode] = useState("")
  const [setupKeyCopied, setSetupKeyCopied] = useState(false)
  const copyResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [passwordError, setPasswordError] = useState<string | undefined>()
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const autoAttempted = useRef(false)

  // `required`/`onEnrolled`/`mode` reflect live props, but the caller may
  // recompute them mid-flow (e.g. a session refetch after `verifyTotp`
  // succeeds could flip a caller's derived `required` to `false`, or `mode`
  // from `"enable"` to `"reset"`, before the user has even seen the backup
  // codes yet). Snapshot all three at the moment the dialog transitions open
  // so a background refetch can't silently turn off the close-guard, drop
  // the post-enroll navigation, or relabel the dialog mid-flow while this
  // same open session is still in progress.
  // `onEnrolledSnapshot` is only ever read from event handlers, so a ref is
  // fine; `isRequiredSession`/`modeSnapshot` mirror into state since they're
  // also read during render (refs can't be read during render).
  const requiredSnapshot = useRef(required)
  const onEnrolledSnapshot = useRef(onEnrolled)
  const [isRequiredSession, setIsRequiredSession] = useState(required)
  const [modeSnapshot, setModeSnapshot] = useState(mode)
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) {
      requiredSnapshot.current = required
      onEnrolledSnapshot.current = onEnrolled
      queueMicrotask(() => {
        setIsRequiredSession(required)
        setModeSnapshot(mode)
      })
    }
    wasOpen.current = open
  }, [open, required, onEnrolled, mode])

  const qrCode = useMemo(
    () => (totpUri ? createQrCodeSvgData(totpUri) : null),
    [totpUri]
  )

  // Manual entry fallback for authenticator apps that can't scan. The URI is
  // an `otpauth://` URL, so the secret is just a query parameter.
  const setupKey = useMemo(() => {
    if (!totpUri) return null

    try {
      return new URL(totpUri).searchParams.get("secret")
    } catch {
      return null
    }
  }, [totpUri])

  useEffect(
    () => () => {
      if (copyResetTimeout.current !== null) {
        clearTimeout(copyResetTimeout.current)
      }
    },
    []
  )

  const copySetupKey = async () => {
    if (!setupKey) return

    try {
      await navigator.clipboard.writeText(setupKey)
      setSetupKeyCopied(true)

      if (copyResetTimeout.current !== null) {
        clearTimeout(copyResetTimeout.current)
      }

      copyResetTimeout.current = setTimeout(() => {
        setSetupKeyCopied(false)
        copyResetTimeout.current = null
      }, 2000)
    } catch {
      toast.error(twoFactorLocalization.setupKeyCopyFailed)
    }
  }

  const enroll = useCallback(
    async (password?: string) => {
      setIsEnrolling(true)
      setPasswordError(undefined)
      try {
        // "reset" means the account is already fully enrolled and verified —
        // resuming via getTotpUri() would just hand back the same secret
        // (the whole point of resetting is a lost/compromised authenticator).
        // getTOTPURI only rejects with TOTP_NOT_ENABLED when no secret exists
        // at all, not when one exists but is unverified, so it can't tell
        // "interrupted enrollment" apart from "already active" — skip the
        // resume attempt for reset and always mint a fresh secret instead.
        if (modeSnapshot !== "reset") {
          const { data: resumeData, error: resumeError } =
            await twoFactorClient.twoFactor.getTotpUri(
              password ? { password } : {}
            )
          if (!resumeError) {
            if (resumeData?.totpURI) setTotpUri(resumeData.totpURI)
            setStep("verify")
            return
          }
          if (resumeError.code !== "TOTP_NOT_ENABLED") {
            if (password) {
              setPasswordError(
                resumeError.message || "Incorrect password. Please try again."
              )
              setStep("password")
            } else {
              toast.error(resumeError.message || "Something went wrong. Please try again.")
            }
            return
          }
        }

        const { data, error } = await twoFactorClient.twoFactor.enable(
          password ? { password } : {}
        )
        if (error) {
          if (password) {
            setPasswordError(error.message || "Incorrect password. Please try again.")
            setStep("password")
          } else {
            toast.error(error.message || "Something went wrong. Please try again.")
          }
          return
        }

        setTotpUri(data?.totpURI ?? "")
        setBackupCodes(data?.backupCodes ?? [])
        setStep("verify")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      } finally {
        setIsEnrolling(false)
      }
    },
    [twoFactorClient, modeSnapshot]
  )

  // Mandatory enrollment: consume a stashed password (from the sign-in form)
  // to skip the password step entirely, or auto-enroll immediately for
  // passwordless accounts. Only attempted once per time the dialog opens.
  useEffect(() => {
    if (!open || !requiredSnapshot.current || autoAttempted.current) return

    const stashedPassword = consumeTwoFactorPassword()
    if (stashedPassword) {
      autoAttempted.current = true
      queueMicrotask(() => enroll(stashedPassword))
      return
    }

    if (isResolvingPasswordRequirement) return

    autoAttempted.current = true
    if (!requiresPassword) {
      queueMicrotask(() => enroll())
    }
  }, [open, isResolvingPasswordRequirement, requiresPassword, enroll])

  const { mutate: verifyTotp, isPending: isVerifying } = useVerifyTotp(
    twoFactorClient,
    {
      onError: () => setCode(""),
      onSuccess: () => {
        toast.success(twoFactorLocalization.twoFactorEnabled)
        setIsVerified(true)

        // Resuming an interrupted setup never repopulates `backupCodes` —
        // they were already shown once, before whatever interrupted it — so
        // there's nothing to show here. Finish immediately instead of
        // rendering an empty "Backup Codes" step.
        if (backupCodes.length > 0) {
          setStep("backupCodes")
        } else if (onEnrolledSnapshot.current) {
          onEnrolledSnapshot.current()
        } else {
          onOpenChange(false)
          resetLocalState()
        }
      }
    }
  )

  const isPending = isEnrolling || isVerifying || isResolvingPasswordRequirement

  const verifyCode = (completedCode: string) => {
    if (isPending || step !== "verify" || completedCode.length !== codeLength) {
      return
    }

    verifyTotp({ code: completedCode })
  }

  const resetLocalState = () => {
    setStep("password")
    setTotpUri("")
    setBackupCodes([])
    setCode("")
    setPasswordError(undefined)
    setIsVerified(false)
    setSetupKeyCopied(false)
    setIsRequiredSession(false)
    autoAttempted.current = false
    wasOpen.current = false
    if (copyResetTimeout.current !== null) {
      clearTimeout(copyResetTimeout.current)
      copyResetTimeout.current = null
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    // Mandatory enrollment can't be dismissed until it's actually done.
    if (requiredSnapshot.current && !nextOpen && !isVerified) return

    onOpenChange(nextOpen)

    if (!nextOpen) resetLocalState()
  }

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (step === "backupCodes") {
      if (onEnrolledSnapshot.current) {
        onEnrolledSnapshot.current()
      } else {
        handleOpenChange(false)
      }
      return
    }

    if (step === "verify") {
      verifyCode(code)
      return
    }

    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string

    enroll(requiresPassword ? password : undefined)
  }

  const enrollActionLabel =
    modeSnapshot === "reset"
      ? "Reset two-factor"
      : twoFactorLocalization.enableTwoFactor

  const submitLabel =
    step === "backupCodes"
      ? twoFactorLocalization.done
      : step === "verify"
        ? twoFactorLocalization.verify
        : enrollActionLabel

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isRequiredSession}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>
              <ShieldCheck />
              {modeSnapshot === "reset" ? "Reset two-factor" : twoFactorLocalization.twoFactor}
            </DialogTitle>

            <DialogDescription>
              {isRequiredSession && step === "password"
                ? "Two-factor authentication is required. Enter your password to begin setup."
                : step === "password" && requiresPassword
                  ? modeSnapshot === "reset"
                    ? "Enter your password to set up a new authenticator. Your existing codes will stop working once the new one is verified."
                    : twoFactorLocalization.passwordConfirmation
                  : step === "verify"
                    ? twoFactorLocalization.scanQrCode
                    : twoFactorLocalization.twoFactorDescription}
            </DialogDescription>
          </DialogHeader>

          {step === "password" && requiresPassword && (
            <Field data-invalid={!!passwordError}>
              <FieldLabel htmlFor="two-factor-password">
                {localization.auth.password}
              </FieldLabel>

              <Input
                id="two-factor-password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                placeholder={localization.auth.passwordPlaceholder}
                disabled={isPending}
                aria-invalid={!!passwordError}
              />

              <FieldError>{passwordError}</FieldError>
            </Field>
          )}

          {step === "verify" && (
            <div className="flex flex-col items-center gap-4">
              {qrCode && (
                <svg
                  aria-hidden="true"
                  className="size-44 rounded-md border"
                  viewBox={`0 0 ${qrCode.size} ${qrCode.size}`}
                >
                  <path
                    fill="white"
                    d={`M0 0h${qrCode.size}v${qrCode.size}H0z`}
                  />
                  <path
                    fill="black"
                    d={qrCode.path}
                    shapeRendering="crispEdges"
                  />
                </svg>
              )}

              {setupKey && (
                <Field className="w-full gap-1">
                  <FieldLabel
                    className="text-muted-foreground text-xs"
                    htmlFor="two-factor-setup-key"
                  >
                    {twoFactorLocalization.setupKey}
                  </FieldLabel>

                  <InputGroup>
                    <InputGroupInput
                      className="font-mono text-xs"
                      id="two-factor-setup-key"
                      readOnly
                      value={setupKey}
                    />

                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        aria-label={
                          setupKeyCopied
                            ? twoFactorLocalization.setupKeyCopied
                            : localization.settings.copyToClipboard
                        }
                        onClick={copySetupKey}
                        size="icon-xs"
                      >
                        {setupKeyCopied ? <Check /> : <Copy />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              )}

              <OtpField
                autoFocus
                className="w-full"
                disabled={isPending}
                label={twoFactorLocalization.authenticatorCode}
                length={codeLength}
                name="code"
                value={code}
                onChange={setCode}
                onComplete={verifyCode}
              />
            </div>
          )}

          {step === "backupCodes" && <BackupCodes codes={backupCodes} />}

          <DialogFooter>
            {!isRequiredSession && step !== "backupCodes" && (
              <DialogClose
                className={buttonVariants({ variant: "outline" })}
                disabled={isPending}
                type="button"
              >
                {localization.settings.cancel}
              </DialogClose>
            )}

            <Button
              type="submit"
              disabled={
                isPending || (step === "verify" && code.length !== codeLength)
              }
            >
              {isPending && <Spinner />}

              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
