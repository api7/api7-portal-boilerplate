export const DEFAULT_LIST_PARAMS = {
  page: 1,
  page_size: 10,
};

/**
 * URL first segments that should never be treated as an organization slug.
 * These are global routes (auth, account, etc.) that don't belong to any org.
 */
export const NON_ORG_PREFIX_ROUTE_SEGMENTS = new Set([
  'auth',
  'account',
  'user-profile',
]);

/**
 * URL first segments reserved by the app — not organization slugs.
 * Includes global routes + org-scoped but path-fixed routes (api-hub, dashboard, organization).
 */
export const RESERVED_FIRST_SEGMENTS = new Set([
  ...NON_ORG_PREFIX_ROUTE_SEGMENTS,
  'api-hub',
  'dashboard',
  'organization',
]);
