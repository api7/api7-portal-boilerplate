"use client"

import {
  type AuthView,
  authMutationKeys,
  getProviderName,
  getSafeRedirectTo
} from "@better-auth-ui/core"
import { providerIcons, useAuth, useSignInSocial } from "@better-auth-ui/react"
import { useIsMutating } from "@tanstack/react-query"
import type { SocialProvider } from "better-auth/social-providers"
import { useSearchParams } from "next/navigation"
import { useState, type ComponentProps } from "react"
import { toast } from "sonner"

import { Button } from "@api7/portal-ui/components/ui/button"
import { Spinner } from "@api7/portal-ui/components/ui/spinner"
import { cn } from "@api7/portal-ui/lib/utils"
import { useConfigStatus } from "@api7/portal-ui/lib/config/config-status-context"
import { LastUsedBadge } from "./last-login-method/last-used-badge"

// The genericOAuth workaround below needs `signIn.oauth2`, which isn't part
// of `useAuth()`'s loosely-typed `authClient` — it's added by the app's own
// `genericOAuthClient()` plugin. Declared locally instead of importing the
// app's concrete client type, so this component doesn't need to know the
// app's client module exists; the contract is "configure this plugin",
// documented, not "import this exact file".
type OAuth2SignInClient = {
  signIn: {
    oauth2: (options: {
      providerId: string
      callbackURL: string
      disableRedirect?: boolean
    }) => Promise<{
      data?: { url?: string } | null
      error?: { message?: string } | null
    }>
  }
}

export type ProviderButtonProps = {
  provider: SocialProvider
  display?: "full" | "name" | "icon"
  view?: AuthView
  /** Pre-fill the IdP login form with this value via `login_hint`. */
  loginHint?: string
} & Omit<ComponentProps<typeof Button>, "onClick" | "children" | "disabled">

/**
 * Social provider sign-in button.
 *
 * @param provider - Provider to sign in with.
 * @param display - `"full"` (e.g. "Continue with Google"), `"name"` (just the provider name), or `"icon"` (icon only).
 * @param loginHint - Pre-fill the IdP login form with this value via `login_hint`.
 */
export function ProviderButton({
  provider,
  display = "full",
  view = "signIn",
  loginHint,
  variant = "outline",
  className,
  ...props
}: ProviderButtonProps) {
  const { authClient, baseURL, localization } = useAuth()
  const oauth2Client = authClient as unknown as OAuth2SignInClient
  const configStatus = useConfigStatus()
  const isGenericOAuth = configStatus.genericOAuthProviders.some(
    (p) => p.provider === provider
  )

  const searchParams = useSearchParams()
  const safeCallback = getSafeRedirectTo(
    searchParams.get("redirectTo"),
    baseURL
  )
  const callbackURL = `${baseURL}${safeCallback}`

  const { mutate: signInSocial, isPending: signInSocialPending } =
    useSignInSocial(authClient)

  const ProviderIcon = providerIcons[provider]

  const signInMutating = useIsMutating({
    mutationKey: authMutationKeys.signIn.all
  })
  const signUpMutating = useIsMutating({
    mutationKey: authMutationKeys.signUp.all
  })

  const [isHinting, setIsHinting] = useState(false)
  const isPending = signInMutating + signUpMutating > 0 || isHinting

  const handleClick = async () => {
    if (isGenericOAuth) {
      // better-auth's genericOAuth plugin captures ctx.baseURL="" in a closure during
      // initialization when DynamicBaseURLConfig is used, causing signIn.social to
      // produce a relative redirect_uri. Use signIn.oauth2 instead — it resolves
      // baseURL per-request at the route level and always produces an absolute URI.
      setIsHinting(true)
      try {
        if (loginHint) {
          // Append login_hint manually since the genericOAuth plugin doesn't forward it.
          const result = await oauth2Client.signIn.oauth2({
            providerId: provider,
            callbackURL,
            disableRedirect: true
          })
          const url: string | undefined = result?.data?.url
          if (url) {
            const parsed = new URL(url)
            parsed.searchParams.set("login_hint", loginHint)
            window.location.href = parsed.toString()
          } else {
            toast.error(result?.error?.message ?? "Sign-in failed. Please try again.")
          }
        } else {
          await oauth2Client.signIn.oauth2({ providerId: provider, callbackURL })
          // redirectPlugin navigates automatically on { redirect: true, url }.
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Sign-in failed. Please try again.")
      } finally {
        setIsHinting(false)
      }
      return
    }
    signInSocial({ provider, callbackURL })
  }

  return (
    <Button
      type="button"
      variant={variant}
      disabled={isPending}
      onClick={handleClick}
      className={cn("relative overflow-visible", className)}
      {...props}
    >
      {signInSocialPending || isHinting ? (
        <Spinner />
      ) : ProviderIcon ? (
        <ProviderIcon />
      ) : null}

      {display === "full"
        ? localization.auth.continueWith.replace(
            "{{provider}}",
            getProviderName(provider)
          )
        : display === "name"
          ? getProviderName(provider)
          : null}

      {display === "icon" && (
        <span className="sr-only">{getProviderName(provider)}</span>
      )}

      {view !== "signUp" && <LastUsedBadge method={provider} floating />}
    </Button>
  )
}
