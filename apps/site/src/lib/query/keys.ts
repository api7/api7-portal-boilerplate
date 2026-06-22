export const productListKey = (orgSlug: string | null, params: object) =>
  orgSlug ? ['portal', 'org', orgSlug, 'products', params] : ['portal', 'products', params];

export const productDetailKey = (orgSlug: string | null, id: string | undefined) =>
  orgSlug ? ['portal', 'org', orgSlug, 'product', id] : ['portal', 'product', id];

export const applicationListKey = (orgSlug: string | null, params: object) =>
  ['portal', 'org', orgSlug, 'applications', params];

export const applicationDetailKey = (orgSlug: string | null, id: string) =>
  ['portal', 'org', orgSlug, 'application', id];

export const subscriptionListKey = (orgSlug: string | null, params: object) =>
  ['subscriptions', orgSlug, params];
