import { produce } from 'immer';
import { isEmpty, isNil, set, unset } from 'lodash-es';
import type { CredentialForm, CredentialFormOAuth } from '@/types/portal-sdk';

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

export const produceToAPIRedirectURIs = produce(
  (draft: CredentialFormOAuth) => {
    if (!isNil(draft.redirect_uris) && !isEmpty(draft.redirect_uris)) {
      set(draft, 'redirect_uris', transformRedirectURIsToAPI(draft.redirect_uris));
    } else {
      unset(draft, 'redirect_uris');
    }
  }
) as (draft: CredentialFormOAuth) => CredentialFormOAuth;

export const produceToFormRedirectURIs = produce((draft: CredentialForm) => {
  if (!isNil(draft.oauth?.redirect_uris) && !isEmpty(draft.oauth?.redirect_uris)) {
    set(
      draft,
      'redirect_uris',
      transformAPIRedirectURIsToForm(draft?.oauth?.redirect_uris)
    );
  } else {
    unset(draft, 'redirect_uris');
  }
}) as (draft: CredentialForm) => CredentialForm;
