"use client"

import { authMutationKeys, getProviderName } from "@better-auth-ui/core"
import { providerIcons, useAuth, useSignInSocial } from "@better-auth-ui/react"
import { useIsMutating } from "@tanstack/react-query"
import type { SocialProvider } from "better-auth/social-providers"
import { useSearchParams } from "next/navigation"
import { useState, type ComponentProps } from "react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { authClient as typedAuthClient } from "@/lib/auth/client"
import { useConfigStatus } from "@/lib/config/config-status-context"

export type ProviderButtonProps = {
  provider: SocialProvider
  display?: "full" | "name" | "icon"
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
  loginHint,
  variant = "outline",
  ...props
}: ProviderButtonProps) {
  const { authClient, baseURL, localization, redirectTo } = useAuth()
  const configStatus = useConfigStatus()
  const isGenericOAuth = configStatus.genericOAuthProviders.some((p) => p.provider === provider)

  const searchParams = useSearchParams()
  const rawCallback = searchParams.get("redirect")
  let safeCallback: string | null = null
  if (rawCallback) {
    try {
      const u = new URL(rawCallback, "http://x")
      safeCallback = u.pathname + u.search
    } catch { /* invalid — ignore */ }
  }
  const callbackURL = `${baseURL}${safeCallback ?? redirectTo}`

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
          const result = await typedAuthClient.signIn.oauth2({
            providerId: provider,
            callbackURL,
            disableRedirect: true,
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
          await typedAuthClient.signIn.oauth2({ providerId: provider, callbackURL })
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
      {...props}
      aria-label={getProviderName(provider)}
    >
      {signInSocialPending || isHinting ? <Spinner /> : <ProviderIcon />}

      {display === "full"
        ? localization.auth.continueWith.replace(
            "{{provider}}",
            getProviderName(provider)
          )
        : display === "name"
          ? getProviderName(provider)
          : null}
    </Button>
  )
}
