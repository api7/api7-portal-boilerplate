"use client"

import { getSafeRedirectTo } from "@better-auth-ui/core"
import { useAuth, useAuthPlugin } from "@better-auth-ui/react"
import { useSearchParams } from "next/navigation"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { organizationPlugin } from "@/lib/auth/organization-plugin"

/**
 * Explains why the user landed on sign-in / sign-up when `?redirectTo=`
 * points at the accept-invitation view.
 */
export function AcceptInvitationNotice() {
  const { basePaths, baseURL } = useAuth()
  const { viewPaths } = useAuthPlugin(organizationPlugin)
  const searchParams = useSearchParams()

  const redirectTo = searchParams.get("redirectTo")
  if (!redirectTo) return null

  const origin = baseURL || "http://localhost"
  const target = new URL(getSafeRedirectTo(redirectTo, origin), origin)
  const acceptInvitationPath = `${basePaths.auth}/${
    viewPaths?.auth?.acceptInvitation ?? "accept-invitation"
  }`
  if (target.pathname !== acceptInvitationPath) return null

  return (
    <Alert className="mx-4 w-auto group-data-[size=sm]/card:mx-3">
      <AlertDescription>
        Sign in or create an account to accept your invitation.
      </AlertDescription>
    </Alert>
  )
}
