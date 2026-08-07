"use client"

import {
  authMutationKeys,
  getAuthLinkURL,
  getSafeRedirectTo
} from "@better-auth-ui/core"
import {
  AuthPrompts,
  useAuth,
  useFetchOptions,
  useSignInEmail
} from "@better-auth-ui/react"
import { useIsMutating } from "@tanstack/react-query"
import type { SocialProvider } from "better-auth/social-providers"
import { Eye, EyeOff } from "lucide-react"
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
  FieldLabel,
  FieldSeparator
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { checkEmailPolicy } from "@/lib/auth/check-email-policy"
import { useSignInContinuation } from "@/lib/auth/use-sign-in-continuation"
import { cn } from "@/lib/utils"
import { LastUsedBadge } from "./last-login-method/last-used-badge"
import { ProviderButton } from "./provider-button"
import { ProviderButtons, type SocialLayout } from "./provider-buttons"

export type SignInProps = {
  className?: string
  socialLayout?: SocialLayout
  socialPosition?: "top" | "bottom"
}

type Phase = "email" | "credentials"

/**
 * Render the sign-in form UI with email/password, magic link, and social provider options.
 *
 * Sign-in is split into two phases: entering an email first, then — after
 * checking the org's SSO policy for that email's domain — either a password
 * form or a locked-in SSO redirect button. This lets SSO-managed domains
 * skip the password form entirely.
 *
 * @param className - Optional additional container class names
 * @param socialLayout - Layout style for social provider buttons
 * @param socialPosition - Position of social provider buttons; `"top"` or `"bottom"`. Defaults to `"bottom"`.
 * @returns The rendered sign-in UI as a JSX element
 */
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
    socialProviders,
    viewPaths,
    navigate,
    Link
  } = useAuth()

  const searchParams = useSearchParams()
  const callbackTarget = getSafeRedirectTo(
    searchParams.get("redirectTo"),
    baseURL
  )

  const { fetchOptions, resetFetchOptions } = useFetchOptions()
  const continueSignIn = useSignInContinuation(callbackTarget)

  const [phase, setPhase] = useState<Phase>("email")
  const [enteredEmail, setEnteredEmail] = useState("")
  const [ssoProviderId, setSsoProviderId] = useState<string | null>(null)
  const [isPolicyPending, startPolicyTransition] = useTransition()
  const [password, setPassword] = useState("")

  const magicLinkPluginInstance = plugins.find(
    (plugin) => plugin.id === "magicLink"
  )
  const hasMagicLink = !!magicLinkPluginInstance
  // `magicLinkPlugin` is only conditionally registered (see app/providers.tsx),
  // so this can't go through `useAuthPlugin` — it throws when the plugin
  // isn't installed. Read the label straight off the plugin instance instead,
  // same as `hasMagicLink` above.
  const sendMagicLinkLabel =
    (magicLinkPluginInstance?.localization?.sendMagicLink as
      | string
      | undefined) ?? "Send login link"

  const { mutate: signInEmail, isPending: signInEmailPending } = useSignInEmail(
    authClient,
    {
      onError: (error, { email }) => {
        setPassword("")

        if (error.error?.code === "EMAIL_NOT_VERIFIED") {
          sessionStorage.setItem("better-auth-ui.verify-email", email)
          navigate({
            to: getAuthLinkURL(
              `${basePaths.auth}/${viewPaths.auth.verifyEmail}`,
              callbackTarget
            )
          })
        }

        resetFetchOptions()
      },
      onSuccess: (data, variables) => continueSignIn(data, variables.password)
    }
  )

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

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

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
        setSsoProviderId(policy.type === "sso" ? policy.providerId : null)
        setPhase("credentials")
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to continue. Please try again."
        )
      }
    })
  }

  const handlePasswordSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    const rememberMe =
      new FormData(e.currentTarget).get("rememberMe") === "on"

    signInEmail({
      email: enteredEmail,
      password,
      ...(emailAndPassword?.rememberMe ? { rememberMe } : {}),
      fetchOptions
    })
  }

  const handleBack = () => {
    setPhase("email")
    setSsoProviderId(null)
    setPassword("")
    setFieldErrors({})
  }

  const showSeparator =
    emailAndPassword?.enabled && socialProviders && socialProviders.length > 0

  const showMagicLinkSeparator =
    emailAndPassword?.enabled && hasMagicLink && !ssoProviderId

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <AuthPrompts view="signIn" />
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
                <ProviderButtons socialLayout={socialLayout} view="signIn" />
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
                  <FieldLabel htmlFor="email">
                    {localization.auth.email}
                  </FieldLabel>

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
                      const el = e.target as HTMLInputElement
                      const msg = el.validity.valueMissing
                        ? localization.auth.fieldRequired
                        : localization.auth.invalidEmail

                      setFieldErrors((prev) => ({
                        ...prev,
                        email: msg
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
                      <FieldLabel htmlFor="password">
                        {localization.auth.password}
                      </FieldLabel>

                      <InputGroup>
                        <InputGroupInput
                          id="password"
                          name="password"
                          type={isPasswordVisible ? "text" : "password"}
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
                            const el = e.target as HTMLInputElement
                            const min = emailAndPassword?.minPasswordLength
                            const max = emailAndPassword?.maxPasswordLength
                            const msg = el.validity.valueMissing
                              ? localization.auth.fieldRequired
                              : el.validity.tooShort
                                ? localization.auth.tooShort.replace(
                                    "{{min}}",
                                    String(min)
                                  )
                                : localization.auth.tooLong.replace(
                                    "{{max}}",
                                    String(max)
                                  )

                            setFieldErrors((prev) => ({
                              ...prev,
                              password: msg
                            }))
                          }}
                          aria-invalid={!!fieldErrors.password}
                          autoFocus
                        />

                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            size="icon-xs"
                            aria-label={
                              isPasswordVisible
                                ? localization.auth.hidePassword
                                : localization.auth.showPassword
                            }
                            title={
                              isPasswordVisible
                                ? localization.auth.hidePassword
                                : localization.auth.showPassword
                            }
                            onClick={() => {
                              setIsPasswordVisible((visible) => !visible)
                            }}
                          >
                            {isPasswordVisible ? <EyeOff /> : <Eye />}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>

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

                          <FieldLabel
                            htmlFor="rememberMe"
                            className="cursor-pointer text-sm font-normal"
                          >
                            {localization.auth.rememberMe}
                          </FieldLabel>
                        </div>
                      </Field>
                    )}

                    {Captcha && (
                      <div className="flex justify-center">{Captcha}</div>
                    )}

                    <div className="flex flex-col gap-3">
                      <Button
                        type="submit"
                        className="relative overflow-visible"
                        disabled={isPending}
                      >
                        {signInEmailPending && <Spinner />}

                        {localization.auth.signIn}

                        <LastUsedBadge method="email" floating />
                      </Button>

                      {plugins.flatMap((plugin) =>
                        (plugin.authButtons ?? []).map((AuthButton, index) => (
                          <AuthButton
                            key={`${plugin.id}-${index.toString()}`}
                            view="signIn"
                          />
                        ))
                      )}
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
                <Link
                  href={`${basePaths.auth}/${viewPaths.auth.magicLink}`}
                  className="self-center text-sm underline-offset-4 hover:underline"
                >
                  {sendMagicLinkLabel}
                </Link>
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
                <ProviderButtons socialLayout={socialLayout} view="signIn" />
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
