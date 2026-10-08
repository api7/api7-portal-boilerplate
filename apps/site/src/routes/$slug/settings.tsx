import { createFileRoute } from '@tanstack/react-router';

import { Organization } from '@/components/auth/organization/organization';

export const Route = createFileRoute('/$slug/settings')({
  component: OrganizationSettingsPage,
});

function OrganizationSettingsPage() {
  return (
    <div className="p-4">
      <Organization path="settings" />
    </div>
  );
}
