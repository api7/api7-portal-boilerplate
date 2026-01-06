export type Attributes = {
  username: string;
  email: string;
  name: string;
};
export type A7Login = {
  password: string;
  email: string;
  username: string;
};
export type LoginOptionListItem = {
  id: string;
  name: string;
  logo: string;
  provider_type: 'ldap' | 'saml' | 'oidc' | 'cas' | 'built_in';
  disable?: boolean;
  oidc_config?: {
    issuer: string;
    client_id: string;
    client_secret: string;
    request_scopes: string[];
    root_url: string;
    ssl_verify: boolean;
    callback_url: string;
    logout_url: string;
    attributes: Attributes;
  };
  saml_config?: {
    entity_id: string;
    idp_metadata_url: string;
    sp_root_url: string;
    sign_request: boolean;
    certificate: string;
    private_key: string;
    attributes: Attributes;
    logout_idp_session: boolean;
  };
  ldap_config?: {
    host: string;
    port: string;
    base_dn: string;
    bind_dn: string;
    bind_password: string;
    identifier: string;
    attributes: Attributes;
    timeout: number;
    use_ssl: boolean;
    ssl_verify: boolean;
    root_ca_cert: string;
    client_cert: string;
    client_key: string;
  };
  cas_config?: { url: string; send_service: boolean; ssl_verify: boolean };
  builtin_config?: {
    enable_self_registration: boolean;
    registration_auto_approval: boolean;
    login_with_email: boolean;
  };
};
