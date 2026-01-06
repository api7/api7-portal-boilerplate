export const keycloakConfig = {
  "client": {
    "clientId": "api7",
    "name": "",
    "description": "",
    "rootUrl": "",
    "adminUrl": "",
    "baseUrl": "",
    "surrogateAuthRequired": false,
    "enabled": true,
    "alwaysDisplayInConsole": false,
    "clientAuthenticatorType": "client-secret",
    "secret": "Wvu2cajJ4vtjJRij0ys3pmbGbS2SWuhd",
    "redirectUris": [
      "*"
    ],
    "webOrigins": [],
    "notBefore": 0,
    "bearerOnly": false,
    "consentRequired": false,
    "standardFlowEnabled": true,
    "implicitFlowEnabled": true,
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": true,
    "authorizationServicesEnabled": true,
    "publicClient": false,
    "frontchannelLogout": true,
    "protocol": "openid-connect",
    "attributes": {
      "oidc.ciba.grant.enabled": "true",
      "client.secret.creation.time": "1708932543",
      "backchannel.logout.session.required": "true",
      "display.on.consent.screen": "false",
      "oauth2.device.authorization.grant.enabled": "true",
      "backchannel.logout.revoke.offline.tokens": "false"
    },
    "authenticationFlowBindingOverrides": {},
    "fullScopeAllowed": true,
    "nodeReRegistrationTimeout": -1,
    "protocolMappers": [  {
      "config": {
        "multivalued": "true",
        "userinfo.token.claim": "true",
        "user.attribute": "foo",
        "access.token.claim": "true",
        "claim.name": "resource_access.${client_id}.roles",
        "jsonType.label": "String"
      },
      "name": "client roles",
      "protocol": "openid-connect",
      "protocolMapper": "oidc-usermodel-client-role-mapper"
    }],
    "defaultClientScopes": [
      "web-origins",
      "acr",
      "profile",
      "roles",
      "api7-mapping",
      "email"
    ],
    "optionalClientScopes": [
      "address",
      "phone",
      "offline_access",
      "microprofile-jwt"
    ],
    "access": {
      "view": true,
      "configure": true,
      "manage": true
    }
  }
};
