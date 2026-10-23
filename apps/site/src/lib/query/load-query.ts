import {
  type FetchQueryOptions,
  type QueryClient,
  type QueryKey,
  isServer,
} from '@tanstack/react-query';

// SSR waits for the data so it ships in the HTML. Client navigations start the
// fetch and return at once, so the page switches immediately and shows its own
// loading state.
export const loadQuery = <TData, TKey extends QueryKey>(
  queryClient: QueryClient,
  options: FetchQueryOptions<TData, Error, TData, TKey>,
) => {
  if (isServer) return queryClient.fetchQuery(options);
  void queryClient.prefetchQuery(options);
};
