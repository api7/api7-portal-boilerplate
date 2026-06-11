import { Suspense } from 'react';

import ApprovalTable from '@/components/approvals/ApprovalTable';
import Header from '@/components/ui-legacy/header';

export const dynamic = 'force-dynamic';

export default async function AdminApprovalsPage() {
  return (
    <div className="card-container">
      <Header
        title="Approvals"
        desc="Review and process subscription and registration requests."
        className="mb-6"
      />
      <Suspense>
        <ApprovalTable />
      </Suspense>
    </div>
  );
}
