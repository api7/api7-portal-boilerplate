import { createFileRoute, notFound } from '@tanstack/react-router';

import { Settings } from '@/components/auth/settings/settings';

const VALID_ACCOUNT_PATHS = new Set(['settings', 'security', 'organizations']);

export const Route = createFileRoute('/_sessionOnly/account/$path')({
  beforeLoad: ({ params }) => {
    if (!VALID_ACCOUNT_PATHS.has(params.path)) {
      throw notFound();
    }
  },
  component: AccountPage,
});

function AccountPage() {
  const { path } = Route.useParams();
  return (
    <div className="p-4">
      <Settings path={path} />
    </div>
  );
}
