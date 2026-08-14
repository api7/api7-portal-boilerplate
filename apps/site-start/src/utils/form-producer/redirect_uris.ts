export const transformRedirectURIsToAPI = (
  redirectURIs?: { redirect_url: string }[]
): string[] => {
  if (!redirectURIs) return [];
  return redirectURIs.map((uri) => uri.redirect_url);
};

export const transformAPIRedirectURIsToForm = (
  redirectURIs?: string[]
): { redirect_url: string }[] => {
  return redirectURIs?.map((uri) => ({ redirect_url: uri })) || [];
};
