import { useAuth } from '@better-auth-ui/react';
import {
  CatchNotFound,
  createFileRoute,
  notFound,
  useLoaderData,
} from '@tanstack/react-router';

import { Auth } from '@/components/auth/auth';
import { PageNotFound } from '@/components/slices/NotFound';
import { checkEmailPolicy } from '@/lib/auth/email-policy';

export const Route = createFileRoute('/auth/$path')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirectTo:
      typeof search.redirectTo === 'string' ? search.redirectTo : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  return (
    <CatchNotFound fallback={() => <PageNotFound />}>
      <AuthView />
    </CatchNotFound>
  );
}

function AuthView() {
  const { path } = Route.useParams();
  const { name, signUpConsentLabel } = useLoaderData({ from: '__root__' });
  const { viewPaths, plugins } = useAuth();

  const isKnownAuthPath =
    Object.values(viewPaths.auth).includes(path) ||
    plugins.some((plugin) =>
      Object.values(plugin.viewPaths?.auth ?? {}).includes(path),
    );
  if (!isKnownAuthPath) {
    throw notFound();
  }

  return (
    <div className="flex flex-col justify-center items-center h-screen w-screen">
      <div className="flex items-center gap-2 mb-4">
        <img src="/favicon.ico" alt={name} width={32} height={32} />
        <span className="text-xl font-semibold">{name}</span>
      </div>
      <Auth
        path={path}
        signUpConsentLabel={signUpConsentLabel}
        checkEmailPolicy={(email) => checkEmailPolicy({ data: email })}
      />
    </div>
  );
}
