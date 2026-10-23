import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import ApplicationDetail from '@/components/applications/ApplicationDetail';
import { applicationDetailQueryOptions } from '@/lib/query/applications';
import { resolveApplicationTab } from '@/lib/query/application-tab';
import {
  credentialListQueryOptions,
  keyAuthFirstPageParams,
} from '@/lib/query/credentials';
import { loadQuery } from '@/lib/query/load-query';
import { subscriptionListQueryOptions } from '@/lib/query/subscriptions';

const searchSchema = z.object({
  tab: z.string().optional(),
  authtype: z.string().optional(),
});

export const Route = createFileRoute('/$slug/applications/$id')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ tab: search.tab, authtype: search.authtype }),
  loader: async ({ params, context, deps }) => {
    const { queryClient, appMeta } = context;
    const config = appMeta.configStatus.applicationDetail;
    const tab = resolveApplicationTab(config, deps.tab ?? null);
    const authType = deps.authtype;

    // The tab's list doesn't depend on the application itself, so both load at
    // once. Failures are left to the components' own `useQuery` error handling.
    await Promise.allSettled([
      loadQuery(
        queryClient,
        applicationDetailQueryOptions(params.slug, params.id),
      ),
      tab === 'subscriptions'
        ? loadQuery(
            queryClient,
            subscriptionListQueryOptions(params.slug, {
              application_id: params.id,
            }),
          )
        : tab === 'credentials' &&
            config.credentialsTabs.keyAuth &&
            (!authType || authType === 'key-auth')
          ? loadQuery(
              queryClient,
              credentialListQueryOptions(
                params.slug,
                keyAuthFirstPageParams(params.id),
              ),
            )
          : undefined,
    ]);
  },
  component: ApplicationDetailPage,
});

function ApplicationDetailPage() {
  const { id } = Route.useParams();
  return <ApplicationDetail id={id} />;
}
