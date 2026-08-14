import type {
  ApiProduct,
  DeveloperPortalLabelResourceType,
  GetApiCallsResponses,
  ListApiProductsResponses,
  ListDeveloperApplicationsResponses,
  ListSubscriptionsResponses,
  ApplicationCredential,
  ApplicationCredentialBasics,
  CreateApplicationCredentialReq,
  UpdateApplicationCredentialReq,
  RegenerateApplicationCredentialReq,
  ListDevelopersErrors,
} from '@api7/portal-sdk/unstable-types';
export type {
  ApiProduct,
  ApplicationCredential,
  ApplicationCredentialBasics,
  CreateApplicationCredentialReq,
  UpdateApplicationCredentialReq,
  RegenerateApplicationCredentialReq,
};
export type ProductGateway = Extract<ApiProduct, { type: 'gateway' }>;
export type ProductExternal = Extract<ApiProduct, { type: 'external' }>;
export type ProductListRes = ListApiProductsResponses['200'];
export type ProductVisibility = ProductGateway['visibility'];
export type CreateProductGateway = ProductGateway & {
  linked_gateway_services?: Array<{
    gateway_group_id: string;
    service_id: string;
  }>;
};
export type SubscriptionItem =
  ListSubscriptionsResponses['200']['list'][number];
export type SubscriptionStatus = SubscriptionItem['status'];
export type ApiProductListItem =
  ListApiProductsResponses['200']['list'][number];
export type ProductSubscriptionStatus = NonNullable<
  ApiProductListItem['subscription_status']
>;
export type ApplicationListItem =
  ListDeveloperApplicationsResponses['200']['list'][number];
export type UsageDataPoint = GetApiCallsResponses['200']['list'][number];
export type LabelParams = {
  resourceType: DeveloperPortalLabelResourceType;
};
type CredentialType<T extends string> = Extract<
  ApplicationCredential,
  { type: T }
>;
type CredentialBasicsType<T extends string> = Extract<
  ApplicationCredentialBasics,
  { type: T }
>;
export type KeyAuthCredential = CredentialType<'key-auth'>;
export type BasicAuthCredential = CredentialType<'basic-auth'>;
export type OAuthCredential = CredentialType<'oauth'>;
export type KeyAuthCredentialBasics = CredentialBasicsType<'key-auth'>;
export type BasicAuthCredentialBasics = CredentialBasicsType<'basic-auth'>;
export type OAuthCredentialBasics = CredentialBasicsType<'oauth'>;
export type PluginCredential = KeyAuthCredential | BasicAuthCredential;
export type OAuthClientInfo = Pick<OAuthCredentialBasics['oauth'], 'client_id' | 'client_secret'>;
export type KeyAuthPluginValue = { key: string };
export type BasicAuthPluginValue = { username: string; password: string };
export type Basics = Pick<KeyAuthCredentialBasics, 'name' | 'desc' | 'labels'>;
export type CredentialForm = Partial<Basics> & {
  'key-auth'?: { key?: string } | null;
  'basic-auth'?: BasicAuthPluginValue;
  oauth?: Pick<OAuthCredentialBasics['oauth'], 'redirect_uris'>;
};
export type CredentialFormOAuth = Pick<
  OAuthCredentialBasics['oauth'],
  'dcr_provider_id'
> &
  Pick<Basics, 'desc'> & {
    redirect_uris: { redirect_url: string }[];
  };
export type ReqError = ListDevelopersErrors['400'];
