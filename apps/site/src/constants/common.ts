export const DEFAULT_LIST_PARAMS = {
  page: 1,
  page_size: 10,
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/**
 * URL first segments that should never be treated as an organization slug.
 * These are global routes (auth, account, docs, etc.) that don't belong to any
 * org. Without this, a logged-in user with an org would have e.g. `/docs`
 * misread as an org slug, and the org-aware navigation would redirect home.
 */
export const NON_ORG_PREFIX_ROUTE_SEGMENTS = new Set([
  'auth',
  'account',
  'docs',
]);

/**
 * URL first segments reserved by the app — not organization slugs.
 * Includes global routes + org-scoped but path-fixed routes (api-hub, admin,
 * organization) + slug-less entry points that redirect to an org (applications).
 */
export const RESERVED_FIRST_SEGMENTS = new Set([
  ...NON_ORG_PREFIX_ROUTE_SEGMENTS,
  'api-hub',
  'admin',
  'organization',
  'applications',
]);
