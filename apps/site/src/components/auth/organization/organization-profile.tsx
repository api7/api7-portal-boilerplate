"use client"

import {
  type OrganizationAuthClient,
  useActiveOrganization,
  useAuth,
  useAuthPlugin
} from "@better-auth-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { type SyntheticEvent, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { organizationPlugin } from "@/lib/auth/organization-plugin"
import { cn } from "@/lib/utils"
import { ChangeOrganizationLogo } from "./change-organization-logo"
import { SlugField } from "./slug-field"

export type OrganizationProfileProps = {
  className?: string
}

/**
 * Profile card for the active organization: logo (when enabled), display name, and slug.
 */
export function OrganizationProfile({ className }: OrganizationProfileProps) {
  const { authClient, localization } = useAuth()
  const { localization: organizationLocalization } =
    useAuthPlugin(organizationPlugin)
  const { data: activeOrganization } = useActiveOrganization(
    authClient as OrganizationAuthClient
  )

  const [slug, setSlug] = useState(activeOrganization?.slug ?? "")
  const [prevOrgSlug, setPrevOrgSlug] = useState(activeOrganization?.slug)
  if (prevOrgSlug !== activeOrganization?.slug) {
    setPrevOrgSlug(activeOrganization?.slug)
    setSlug(activeOrganization?.slug ?? "")
  }

  const router = useRouter()
  const queryClient = useQueryClient()

  // Use useMutation directly so navigation fires immediately after the HTTP
  // response — not after MutationInvalidator's awaited query refetches, which
  // re-fetch using the now-invalid old slug and retry-loop for ~7 seconds.
  const { mutate: commitOrganizationUpdate, isPending } = useMutation({
    mutationFn: async ({
      name,
      slug: newSlug,
    }: {
      name: string
      slug: string
    }) => {
      const client = authClient as OrganizationAuthClient
      const result = await client.organization.update({
        organizationId: activeOrganization!.id,
        data: { name, slug: newSlug },
        fetchOptions: { throw: true },
      })
      return { result, newSlug }
    },
    onSuccess: ({ newSlug }) => {
      toast.success(organizationLocalization.organizationUpdatedSuccess)
      if (newSlug !== activeOrganization?.slug) {
        router.push(`/${newSlug}/settings`)
      }
      // Invalidate all auth org queries so other components reflect the update.
      queryClient.invalidateQueries({ queryKey: ["auth"] })
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error)
      toast.error(msg || 'Failed to update organization')
    },
  })

  function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!activeOrganization) return

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string

    commitOrganizationUpdate({ name, slug })
  }

  const nameInputId = `${activeOrganization?.id ?? "org"}-name`
  const slugInputId = `${activeOrganization?.id ?? "org"}-slug`

  return (
    <div>
      <h2 className={cn("mb-3 text-sm font-semibold")}>
        {organizationLocalization.organizationProfile}
      </h2>

      <Card className={className}>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <ChangeOrganizationLogo />

            <Field>
              <Label htmlFor={nameInputId}>
                {organizationLocalization.name}
              </Label>

              {activeOrganization ? (
                <Input
                  key={activeOrganization.id}
                  id={nameInputId}
                  name="name"
                  defaultValue={activeOrganization.name}
                  autoComplete="organization"
                  placeholder={organizationLocalization.namePlaceholder}
                  disabled={isPending}
                />
              ) : (
                <Skeleton className="h-8 w-full rounded-md" />
              )}

              <FieldError />
            </Field>

            {activeOrganization ? (
              <SlugField
                id={slugInputId}
                value={slug}
                onChange={setSlug}
                currentSlug={activeOrganization.slug}
                disabled={isPending}
              />
            ) : (
              <Field>
                <Label>{organizationLocalization.slug}</Label>
                <Skeleton className="h-8 w-full rounded-md" />
              </Field>
            )}

            <Button
              type="submit"
              disabled={isPending || !activeOrganization}
              size="sm"
              className="mt-1 w-fit"
            >
              {isPending && <Spinner />}

              {localization.settings.saveChanges}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
