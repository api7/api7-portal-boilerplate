import { redirect } from 'next/navigation';

import ApprovalTable from '@/components/admin/approvals/ApprovalTable';
import { SectionHeader } from '@/components/base/section-header';
import { PATH_ROOT } from '@/constants/path-prefix';
import { getCurrentPlatformAdminSession } from '@/lib/auth/platform-admin.server';

export const dynamic = 'force-dynamic';

export default async function AdminApprovalsPage() {
  if (!(await getCurrentPlatformAdminSession())) redirect(PATH_ROOT);
  return (
    <div className="card-container">
      <SectionHeader
        title="Approvals"
        desc="Review and process subscription and registration requests."
        className="mb-6"
      />
      <ApprovalTable />
    </div>
  );
}
