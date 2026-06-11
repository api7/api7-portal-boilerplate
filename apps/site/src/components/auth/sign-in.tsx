"use client"

import { authMutationKeys } from "@better-auth-ui/core"
import {
  useAuth,
  useFetchOptions,
  useSendVerificationEmail,
  useSignInEmail,
  useSignInMagicLink
} from "@better-auth-ui/react"
import { useIsMutating } from "@tanstack/react-query"
import type { SocialProvider } from "better-auth/social-providers"
import { useSearchParams } from "next/navigation"
import { type SyntheticEvent, useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSeparator
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { authClient as typedAuthClient } from "@/lib/auth/client"
import { checkEmailPolicy } from "@/lib/auth/check-email-policy"
import { cn } from "@/lib/utils"
import { ProviderButton } from "./provider-button"
import { ProviderButtons, type SocialLayout } from "./provider-buttons"

export type SignInProps = {
  className?: string
  socialLayout?: SocialLayout
  socialPosition?: "top" | "bottom"
}

type Phase = "email" | "credentials"

export function SignIn({
  className,
  socialLayout,
  socialPosition = "bottom"
}: SignInProps) {
  const {
    authClient,
    basePaths,
    baseURL,
    emailAndPassword,
    localization,
    plugins,
    redirectTo,
    socialProviders,
    viewPaths,
    navigate,
    Link
  } = useAuth()

  const searchParams = useSearchParams()
  const rawCallback = searchParams.get("redirect")
  let callbackTarget: string | null = null
  if (rawCallback) {
    try {
      const u = new URL(rawCallback, "http://x")
      callbackTarget = u.pathname + u.search
    } catch { /* invalid — ignore */ }
  }

  const { fetchOptions, resetFetchOptions } = useFetchOptions()

  const [phase, setPhase] = useState<Phase>("email")
  const [enteredEmail, setEnteredEmail] = useState("")
  const [ssoProviderId, setSsoProviderId] = useState<string | null>(null)
  const [isPolicyPending, startPolicyTransition] = useTransition()
  const [password, setPassword] = useState("")
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const hasMagicLink = plugins.some((p) => p.id === "magic-link")

  const { mutate: sendVerificationEmail } = useSendVerificationEmail(
    authClient,
    {
      onSuccess: () => toast.success(localization.auth.verificationEmailSent)
    }
  )

  const { mutate: signInEmail, isPending: signInEmailPending } = useSignInEmail(
    authClient,
    {
      onError: (error, { email }) => {
        setPassword("")

        if (error.error?.code === "EMAIL_NOT_VERIFIED") {
          toast.error(error.error?.message || error.message, {
            action: {
              label: localization.auth.resend,
              onClick: () =>
                sendVerificationEmail({
                  email,
                  callbackURL: `${baseURL}${callbackTarget ?? redirectTo}`
                })
            }
          })
        }

        resetFetchOptions()
      },
      onSuccess: () => navigate({ to: callbackTarget ?? redirectTo })
    }
  )

  const { mutate: signInMagicLink, isPending: magicLinkPending } =
    useSignInMagicLink(typedAuthClient, {
      onSuccess: () => setMagicLinkSent(true),
      onError: (error) => {
        toast.error(error.error?.message || error.message)
        resetFetchOptions()
      }
    })

  const signInMutating = useIsMutating({
    mutationKey: authMutationKeys.signIn.all
  })
  const signUpMutating = useIsMutating({
    mutationKey: authMutationKeys.signUp.all
  })
  const isPending = signInMutating + signUpMutating > 0 || isPolicyPending

  const Captcha = plugins.find(
    (plugin) => plugin.captchaComponent
  )?.captchaComponent

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const handleEmailContinue = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = enteredEmail.trim()

    startPolicyTransition(async () => {
      try {
        const policy = await checkEmailPolicy(email)
        if (policy.type === "sso") {
          setSsoProviderId(policy.providerId)
        } else {
          setSsoProviderId(null)
        }
        setPhase("credentials")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to continue. Please try again.")
      }
    })
  }

  const handlePasswordSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    signInEmail({
      email: enteredEmail,
      password,
      ...(emailAndPassword?.rememberMe
        ? {
            rememberMe:
              (new FormData(e.currentTarget).get("rememberMe") as string) ===
              "on"
          }
        : {}),
      fetchOptions
    })
  }

  const handleBack = () => {
    setPhase("email")
    setSsoProviderId(null)
    setPassword("")
    setMagicLinkSent(false)
    setFieldErrors({})
  }

  const showSeparator =
    emailAndPassword?.enabled && socialProviders && socialProviders.length > 0

  const showMagicLinkSeparator =
    emailAndPassword?.enabled && hasMagicLink && !ssoProviderId

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {localization.auth.signIn}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-6">
          {socialPosition === "top" && (
            <>
              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons socialLayout={socialLayout} />
              )}

              {showSeparator && (
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card m-0 text-xs flex items-center">
                  {localization.auth.or}
                </FieldSeparator>
              )}
            </>
          )}

          {/* Phase 1: email input */}
          {phase === "email" && (
            <form onSubmit={handleEmailContinue}>
              <FieldGroup>
                <Field data-invalid={!!fieldErrors.email}>
                  <Label htmlFor="email">{localization.auth.email}</Label>

                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={localization.auth.emailPlaceholder}
                    value={enteredEmail}
                    required
                    disabled={isPending}
                    onChange={(e) => {
                      setEnteredEmail(e.target.value)
                      setFieldErrors((prev) => ({ ...prev, email: undefined }))
                    }}
                    onInvalid={(e) => {
                      e.preventDefault()
                      setFieldErrors((prev) => ({
                        ...prev,
                        email: (e.target as HTMLInputElement).validationMessage
                      }))
                    }}
                    aria-invalid={!!fieldErrors.email}
                  />

                  <FieldError>{fieldErrors.email}</FieldError>
                </Field>

                <Button type="submit" disabled={isPending}>
                  {isPolicyPending && <Spinner />}
                  {"Continue"}
                </Button>
              </FieldGroup>
            </form>
          )}

          {/* Phase 2: SSO redirect */}
          {phase === "credentials" && ssoProviderId && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground break-all">
                {enteredEmail}
              </p>

              <ProviderButton
                provider={ssoProviderId as SocialProvider}
                display="full"
                loginHint={enteredEmail}
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={isPending}
              >
                {"Back"}
              </Button>
            </div>
          )}

          {/* Phase 2: credentials (password / magic link) */}
          {phase === "credentials" && !ssoProviderId && (
            <>
              <p className="text-sm text-muted-foreground break-all -mb-2">
                {enteredEmail}
              </p>

              {emailAndPassword?.enabled && (
                <form onSubmit={handlePasswordSubmit}>
                  <FieldGroup>
                    <Field data-invalid={!!fieldErrors.password}>
                      <Label htmlFor="password">
                        {localization.auth.password}
                      </Label>

                      <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          setFieldErrors((prev) => ({
                            ...prev,
                            password: undefined
                          }))
                        }}
                        placeholder={localization.auth.passwordPlaceholder}
                        required
                        minLength={emailAndPassword?.minPasswordLength}
                        maxLength={emailAndPassword?.maxPasswordLength}
                        disabled={isPending}
                        onInvalid={(e) => {
                          e.preventDefault()
                          setFieldErrors((prev) => ({
                            ...prev,
                            password: (e.target as HTMLInputElement)
                              .validationMessage
                          }))
                        }}
                        aria-invalid={!!fieldErrors.password}
                        autoFocus
                      />

                      <FieldError>{fieldErrors.password}</FieldError>
                    </Field>

                    {emailAndPassword.rememberMe && (
                      <Field className="my-1">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="rememberMe"
                            name="rememberMe"
                            disabled={isPending}
                          />

                          <Label
                            htmlFor="rememberMe"
                            className="cursor-pointer text-sm font-normal"
                          >
                            {localization.auth.rememberMe}
                          </Label>
                        </div>
                      </Field>
                    )}

                    {Captcha && (
                      <div className="flex justify-center">{Captcha}</div>
                    )}

                    <div className="flex flex-col gap-3">
                      <Button type="submit" disabled={isPending}>
                        {signInEmailPending && <Spinner />}
                        {localization.auth.signIn}
                      </Button>
                    </div>
                  </FieldGroup>
                </form>
              )}

              {showMagicLinkSeparator && (
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card text-xs flex items-center">
                  {localization.auth.or}
                </FieldSeparator>
              )}

              {hasMagicLink && (
                <>
                  {magicLinkSent ? (
                    <p className="text-sm text-center text-muted-foreground">
                      {"Check your email for a login link."}
                    </p>
                  ) : (
                    <Button
                      type="button"
                      variant={emailAndPassword?.enabled ? "outline" : "default"}
                      disabled={isPending || magicLinkPending}
                      onClick={() =>
                        signInMagicLink({
                          email: enteredEmail,
                          callbackURL: `${baseURL}${callbackTarget ?? redirectTo}`,
                          fetchOptions
                        })
                      }
                    >
                      {magicLinkPending && <Spinner />}
                      {"Send login link"}
                    </Button>
                  )}
                </>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={isPending}
              >
                {"Back"}
              </Button>
            </>
          )}

          {socialPosition === "bottom" && phase === "email" && (
            <>
              {showSeparator && (
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card text-xs flex items-center">
                  {localization.auth.or}
                </FieldSeparator>
              )}

              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons socialLayout={socialLayout} />
              )}
            </>
          )}
        </div>

        {phase === "email" && (
          <div className="flex flex-col gap-3 items-center w-full mt-4">
            {emailAndPassword?.forgotPassword && (
              <Link
                href={`${basePaths.auth}/${viewPaths.auth.forgotPassword}`}
                className="self-center text-sm underline-offset-4 hover:underline"
              >
                {localization.auth.forgotPasswordLink}
              </Link>
            )}

            {emailAndPassword?.enabled && (
              <FieldDescription className="text-center">
                {localization.auth.needToCreateAnAccount}{" "}
                <Link
                  href={`${basePaths.auth}/${viewPaths.auth.signUp}`}
                  className="underline underline-offset-4"
                >
                  {localization.auth.signUp}
                </Link>
              </FieldDescription>
            )}
          </div>
        )}

        {phase === "credentials" && !ssoProviderId && (
          <div className="flex flex-col gap-3 items-center w-full mt-4">
            {emailAndPassword?.forgotPassword && (
              <Link
                href={`${basePaths.auth}/${viewPaths.auth.forgotPassword}`}
                className="self-center text-sm underline-offset-4 hover:underline"
              >
                {localization.auth.forgotPasswordLink}
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
