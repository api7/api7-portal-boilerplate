'use client';

import { Organization } from '@/components/auth/organization/organization';

export default function OrganizationSettingsPage() {
  return (
    <main className="container p-4 md:p-6">
      <Organization path="settings" />
    </main>
  );
}
