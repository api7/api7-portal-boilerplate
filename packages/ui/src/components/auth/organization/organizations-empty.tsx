"use client"

import { useAuthPlugin } from "@better-auth-ui/react"
import { Briefcase } from "lucide-react"

import { Button } from "@api7/portal-ui/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@api7/portal-ui/components/ui/empty"
import { organizationPlugin } from "@api7/portal-ui/lib/auth/organization-plugin"

export type OrganizationsEmptyProps = {
  onCreatePress: () => void
}

export function OrganizationsEmpty({ onCreatePress }: OrganizationsEmptyProps) {
  const { localization: organizationLocalization } =
    useAuthPlugin(organizationPlugin)

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Briefcase />
        </EmptyMedia>
        <EmptyTitle>{organizationLocalization.noOrganizations}</EmptyTitle>
        <EmptyDescription>
          {organizationLocalization.organizationsDescription}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" onClick={onCreatePress}>
          {organizationLocalization.createOrganization}
        </Button>
      </EmptyContent>
    </Empty>
  )
}
