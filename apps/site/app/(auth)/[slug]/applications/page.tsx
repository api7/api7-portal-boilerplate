import ApplicationTable from '@/components/applications/ApplicationTable';
import Header from '@/components/ui/header';
import { Suspense } from 'react';

export default function AuthApplications() {
  return (
    <div className="card-container">
      <Header title="My Applications" className="mb-6" />
      <Suspense>
        <ApplicationTable />
      </Suspense>
    </div>
  );
}
