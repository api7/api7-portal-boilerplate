"use client"

import {
  type OrganizationAuthClient,
  useActiveOrganization,
  useAuth,
  useAuthPlugin,
  useListOrganizations,
  useSession,
  useSetActiveOrganization
} from "@better-auth-ui/react"
import type { Organization } from "better-auth/client"
import {
  ChevronsUpDown,
  PlusCircle,
  Settings as SettingsIcon
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { type ReactNode, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { organizationPlugin } from "@/lib/auth/organization-plugin"
import { cn } from "@/lib/utils"
import { UserView } from "../user/user-view"
import { CreateOrganizationDialog } from "./create-organization-dialog"
import { OrganizationLogo } from "@/components/auth/organization/organization-logo"
import { OrganizationView } from "./organization-view"

/** Props for the `OrganizationSwitcher` component. */
export type OrganizationSwitcherProps = {
  className?: string
  align?: "center" | "end" | "start"
  sideOffset?: number
  trigger?: ReactNode
  hideCreate?: boolean
  hidePersonal?: boolean
  hideSettings?: boolean
  hideSlug?: boolean
  /** Pass `true` from a server component to avoid client-side session flash. */
  authorized?: boolean
  /** Icon-only trigger: renders just the org logo button. */
  size?: "icon"
  setActive?: (organization: Organization | null) => void
}

/**
 * Renders an organizations dropdown with a trigger button,
 * header summary, and a menu of organizations to switch to.
 * Switching orgs preserves the current URL path (replaces the slug segment).
 */
export function OrganizationSwitcher({
  className,
  align,
  sideOffset,
  hideCreate,
  hidePersonal,
  hideSettings,
  hideSlug = true,
  authorized,
  size,
  setActive,
  trigger
}: OrganizationSwitcherProps) {
  const { authClient, basePaths, viewPaths, Link } =
    useAuth()
  const { data: session, isPending: sessionPending } = useSession(authClient)
  const {
    localization: organizationLocalization,
    viewPaths: organizationViewPaths,
    slug
  } = useAuthPlugin(organizationPlugin)

  const pathname = usePathname()
  const router = useRouter()

  const isAuthorized = authorized ?? !!session

  const { data: activeOrganization, isPending: activeOrganizationPending } =
    useActiveOrganization(authClient as OrganizationAuthClient)

  const { data: organizations, isPending: organizationsPending } =
    useListOrganizations(authClient as OrganizationAuthClient, {
      enabled: isAuthorized
    })

  const { mutate: setActiveOrganization } = useSetActiveOrganization(
    authClient as OrganizationAuthClient
  )

  const isPending =
    sessionPending ||
    (isAuthorized && (organizationsPending || activeOrganizationPending))

  const [createOpen, setCreateOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const otherOrganizations =
    organizations?.filter(
      (organization) => organization.id !== activeOrganization?.id
    ) ?? []

  const hasOtherEntries =
    otherOrganizations.length > 0 || (!!activeOrganization && !hidePersonal)

  function switchOrgHref(newSlug: string) {
    if (slug) {
      const segments = pathname.split("/").filter(Boolean)
      const rest =
        segments.length > 1 ? segments.slice(1).join("/") : "applications"
      return `/${newSlug}/${rest}`
    }
    return `/${newSlug}/applications`
  }

  function handleSetActive(organization: Organization | null) {
    setDropdownOpen(false)

    if (setActive) {
      setActive(organization)
    } else if (slug !== undefined) {
      router.push(
        organization
          ? switchOrgHref(organization.slug!)
          : `${basePaths.settings}/${viewPaths.settings.account}`
      )
    } else {
      setActiveOrganization({ organizationId: organization?.id ?? null })
    }
  }

  const iconTrigger = (
    <DropdownMenuTrigger
      render={
        <Button
          data-testid="org-switcher"
          aria-label="Open organization switcher"
          size="icon"
          className={cn("size-fit rounded-full", className)}
          variant="ghost"
          disabled={isPending}
        />
      }
    >
      <OrganizationLogo
        key={activeOrganization?.logo}
        isPending={isPending}
        organization={activeOrganization ?? undefined}
      />
    </DropdownMenuTrigger>
  )

  const defaultTrigger = trigger ? (
    <DropdownMenuTrigger>{trigger}</DropdownMenuTrigger>
  ) : (
    <DropdownMenuTrigger
      render={
        <Button
          variant="ghost"
          className={cn("h-auto px-2 py-2 text-left", className)}
          disabled={!session || isPending}
        />
      }
    >
      {isPending ? (
        <OrganizationView isPending hideRole hideSlug={hideSlug} />
      ) : activeOrganization ? (
        <OrganizationView hideRole hideSlug={hideSlug} />
      ) : session && !hidePersonal ? (
        <UserView hideSubtitle={hideSlug} />
      ) : (
        <OrganizationView
          hideRole
          hideSlug={hideSlug}
          organization={{ name: organizationLocalization.organization }}
        />
      )}
      <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
    </DropdownMenuTrigger>
  )

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        {size === "icon" ? iconTrigger : defaultTrigger}

        <DropdownMenuContent
          align={align}
          sideOffset={sideOffset}
          className="min-w-64 max-w-svw"
        >
          {activeOrganization ? (
            <div className="flex items-center justify-between gap-4 px-2 py-2">
              <OrganizationView
                hideRole
                hideSlug={hideSlug}
                organization={activeOrganization}
              />

              {!hideSettings && (
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0"
                  render={
                    <Link
                      href={
                        slug
                          ? `${basePaths.organization}/${slug}/${organizationViewPaths.organization.settings}`
                          : `${basePaths.organization}/${organizationViewPaths.organization.settings}`
                      }
                    />
                  }
                  nativeButton={false}
                >
                  <SettingsIcon className="text-muted-foreground" />
                </Button>
              )}
            </div>
          ) : !isPending && session?.user && !hidePersonal ? (
            <div className="flex items-center justify-between gap-4 px-2 py-2">
              <UserView hideSubtitle={hideSlug} />

              {!hideSettings && (
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0"
                  render={
                    <Link
                      href={`${basePaths.settings}/${viewPaths.settings.account}`}
                    />
                  }
                  nativeButton={false}
                >
                  <SettingsIcon className="text-muted-foreground" />
                </Button>
              )}
            </div>
          ) : null}

          {activeOrganization && <DropdownMenuSeparator />}

          {!activeOrganization && !isPending && (
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Select organization
            </p>
          )}

          {!!activeOrganization && !hidePersonal && (
            <DropdownMenuItem onClick={() => handleSetActive(null)}>
              <UserView hideSubtitle={hideSlug} />
            </DropdownMenuItem>
          )}

          {otherOrganizations.map((organization) => (
            <DropdownMenuItem
              key={organization.id}
              onClick={() => handleSetActive(organization)}
            >
              <OrganizationView
                hideRole
                hideSlug={hideSlug}
                organization={organization}
              />
            </DropdownMenuItem>
          ))}

          {!hideCreate && (
            <>
              {hasOtherEntries && <DropdownMenuSeparator />}

              <DropdownMenuItem
                onClick={() => {
                  setDropdownOpen(false)
                  setCreateOpen(true)
                }}
              >
                <PlusCircle className="text-muted-foreground" />

                {organizationLocalization.createOrganization}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrganizationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  )
}
