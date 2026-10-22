import { useAuth } from '@better-auth-ui/react';
import {
  CatchNotFound,
  createFileRoute,
  notFound,
  redirect,
  useLoaderData,
} from '@tanstack/react-router';

import { Auth } from '@/components/auth/auth';
import { PageNotFound } from '@/components/slices/NotFound';
import { PATH_LOGIN } from '@/constants/path-prefix';
import { checkEmailPolicy } from '@/lib/auth/check-email-policy';
import { hasTwoFactorChallengeCookie } from '@/lib/dal/session';

export const Route = createFileRoute('/auth/$path')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirectTo:
      typeof search.redirectTo === 'string' ? search.redirectTo : undefined,
  }),
  // The 2FA challenge only works mid sign-in; other auth views stay open.
  beforeLoad: async ({ params, search }) => {
    if (params.path !== 'two-factor') return;
    if (await hasTwoFactorChallengeCookie()) return;

    const query = search.redirectTo
      ? `?redirectTo=${encodeURIComponent(search.redirectTo)}`
      : '';
    throw redirect({ href: `${PATH_LOGIN}${query}` });
  },
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
