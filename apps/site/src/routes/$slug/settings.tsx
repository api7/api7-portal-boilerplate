import { createFileRoute } from '@tanstack/react-router';

import { Organization } from '@/components/auth/organization/organization';

export const Route = createFileRoute('/$slug/settings')({
  component: OrganizationSettingsPage,
});

function OrganizationSettingsPage() {
  return (
    <main className="container p-4 md:p-6">
      <Organization path="settings" />
    </main>
  );
}
