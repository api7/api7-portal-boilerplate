# api7ee-developer-portal

## 0.5.0

### Patch Changes

- docs: update README to include instructions for creating a public URL for local developer portal by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/218
- [BREAKING] rewrite: with nextjs 16 by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/220
- fix: page level auth by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/243
- fix: old style by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/250
- feat: preflight portal and db by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/251
- docs: new nextjs version devportal usage by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/245
- feat: delete developer synchronously when deleting organization by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/252
- feat: add dependency age check workflow and script by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/253
- feat: using cosign sign image by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/256
- feat: build and push release image by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/257
- chore: using cosign oidc to sign image by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/259
- chore: using cosign notary by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/260
- feat: push release image to docker hub by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/261
- feat: use @api7/portal-sdk instead of api calls by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/255
- feat: enhance image signing process with support for both private and public registries by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/262

## 0.4.9

### Patch Changes

- [#215](https://github.com/api7/api7ee-developer-portal/pull/215) [`eda931b`](https://github.com/api7/api7ee-developer-portal/commit/eda931badc96e9573258aa039f15859ea80fb3ae) Thanks [@LiteSun](https://github.com/LiteSun)! - \* test: add oauth test by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/210

## 0.4.7

### Patch Changes

- feat: add oauth (#203)

## 0.4.6

### Patch Changes

- feat(cas): adapt cas login/logout by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/193
- chore: update package dependencies by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/194
- fix(logout): using correct sso logout api by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/195

## 0.4.5

### Patch Changes

- [#191](https://github.com/api7/api7ee-developer-portal/pull/191) [`2b92807`](https://github.com/api7/api7ee-developer-portal/commit/2b92807d0e4303add1fdbe952ef5b6d8be75746a) Thanks [@LiteSun](https://github.com/LiteSun)! - refactor(Chart): optimize tooltip display

## 0.4.4

### Patch Changes

- CI: trigger control plane build on commit via GitHub Actions by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/187
- chore: update scalar version by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/168
- feat: add application usage page by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/186

## 0.4.3

### Patch Changes

- fix: naviagte to application logic by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/177
- fix(applications): use line type tab by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/178
- refactor(api-hub): standardize subscription parameter naming by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/184
- feat: add refetch logic for subscription component by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/183
- fix: SubscribeAPIProductApplicationModal refresh after submit by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/180
- fix(applications): update resource type from 'application' to 'developer_application' by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/185
- fix: SubscribeAPIProductModal refresh after submit by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/181
- fix: credentials api fetch logic by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/179

## 0.4.2

### Patch Changes

- test: change smtp mock server by @Baoyuantop in https://github.com/api7/api7ee-developer-portal/pull/120
- refactor: remove 'Clear All' button from Filter component by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/162
- fix: adjust based on the new ee license API by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/170
- CI: update GitHub Actions workflow to conditionally upload images on branch by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/172
- feat: multi applications by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/159
- test(multi-applications): application list crud by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/174
- test(multi-applications): application detail subscriptions crud by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/175

## 0.4.1

### Patch Changes

- feat: use the repaired node instead of skipping the check by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/141

## 0.4.0

### Minor Changes

- fix: dependabot alerts by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/129
- dev: support basic auth by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/135
- test: login with email by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/132
- feat: add basic auth in scalar by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/136
- feat: optimize email login text by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/137

## 0.3.4

### Patch Changes

- feat: add pageSize in list page by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/125

## 0.3.3

### Patch Changes

- fix: prevent default keyboard enter event in scalar component password input in https://github.com/api7/api7ee-developer-portal/pull/124

## 0.3.2

### Patch Changes

- fix: update user name display by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/117
- fix: refresh on window focus by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/119
- fix: add email verify judgement by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/118

## 0.3.1

### Patch Changes

- fix: update product list cache by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/114
- fix(login): hide divider when no sso options by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/113
- fix: rm refetchOnWindowFocus, clear query client when authorized changed by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/112
- style: subscribe product status tag style by @guoqqqi in https://github.com/api7/api7ee-developer-portal/pull/115

**Full Changelog**: https://github.com/api7/api7ee-developer-portal/compare/v0.3.0...v0.3.1

## 0.3.0

### Minor Changes

- style: add eslint and format code by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/84
- feat: add user profile basics by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/83
- feat: support developer signup by @guoqqqi in https://github.com/api7/api7ee-developer-portal/pull/82
- feat: add user account by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/85
- feat: add user bind email ui by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/86
- feat: add type checks script by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/90
- feat: add rebind and unbind email by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/87
- fix: explicitly install internal dependencies by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/89
- feat: add email status judgement by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/91
- test: add user profile password test by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/88
- feat: add bind email alert by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/93
- fix: node env, build cmds in build-related workflows by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/95
- test: add user name test by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/92
- feat(login-sso): login options by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/98
- feat: portal product sub status and filter by @guoqqqi in https://github.com/api7/api7ee-developer-portal/pull/99
- test: add email test by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/96
- feat: add scalar docs paste trim by @oil-oil in https://github.com/api7/api7ee-developer-portal/pull/97
- test(portal-sso): login options by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/101
- feat: support developer subs product by @guoqqqi in https://github.com/api7/api7ee-developer-portal/pull/100
- feat: no login user access by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/102
- test: adjust old cases to fit new logic by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/104
- feat: portal sso, guest access, scim by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/94
- feat: test developer sign up by @guoqqqi in https://github.com/api7/api7ee-developer-portal/pull/103
- test(no-need-login): new tests by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/106
- test(no-need-login): not found pages by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/108
- test: product approval by @guoqqqi in https://github.com/api7/api7ee-developer-portal/pull/107
- docs: update Let's Start from Here by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/109

## New Contributors

- @oil-oil made their first contribution in https://github.com/api7/api7ee-developer-portal/pull/84
- @guoqqqi made their first contribution in https://github.com/api7/api7ee-developer-portal/pull/82

**Full Changelog**: https://github.com/api7/api7ee-developer-portal/compare/v0.2.2...v0.2.3

## 0.2.2

### Patch Changes

- feat: temporarily remove theme switch by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/80

**Full Changelog**: https://github.com/api7/api7ee-developer-portal/compare/v0.2.1...v0.2.2

## 0.2.1

### Patch Changes

- fix(credentials/edit): produce labels before submit by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/73
- feat(api-hub): gateway product disable status by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/75
- fix: scalar clear site cookie by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/74
- style(darkmode): product card, back btn by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/76
- feat: use api data in auth setting by @Baoyuantop in https://github.com/api7/api7ee-developer-portal/pull/78

**Full Changelog**: https://github.com/api7/api7ee-developer-portal/compare/v0.2.0...v0.2.1

## 0.2.0

### Minor Changes

- chore: rm node proxy api by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/51
- docs: update README by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/56
- feat: login, logout by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/55
- feat: reset one time password by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/57
- refactor: run ci in the same way as console by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/54
- feat: allow manual, dev branch push build archive to cos by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/59
- fix(build-prod-image): push to cos cmd by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/60
- feat: credentials table ui by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/58
- feat(credential): key auth add drawer by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/61
- feat(credential): edit, detail, delete drawer by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/62
- feat: adjust apis, rm chakra provider by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/64
- feat(api-hub): multi tabs by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/65
- feat: full screen loading, apihub old test, auth test by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/67
- feat: auto fill api key in test request by @Baoyuantop in https://github.com/api7/api7ee-developer-portal/pull/68
- test(apihub): gateway product by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/69
- test(credential): crud, sort by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/71

## New Contributors

- @Baoyuantop made their first contribution in https://github.com/api7/api7ee-developer-portal/pull/68

**Full Changelog**: https://github.com/api7/api7ee-developer-portal/compare/v0.1.3...v0.2.0

## 0.1.3

### Patch Changes

- [#45](https://github.com/api7/api7ee-developer-portal/pull/45) [`d9e7025`](https://github.com/api7/api7ee-developer-portal/commit/d9e70255ca5b8a94443af6ff138018ad75819948) Thanks [@LiteSun](https://github.com/LiteSun)! - feat: improve api product list loading time

## 0.1.2

### Patch Changes

- [#42](https://github.com/api7/api7ee-developer-portal/pull/42) [`7a81aed`](https://github.com/api7/api7ee-developer-portal/commit/7a81aed193ab4b871c881b878c5983fd05445271) Thanks [@LiteSun](https://github.com/LiteSun)! - feat: update scalar version to 0.3.103

## 0.1.1

### Patch Changes

- [#40](https://github.com/api7/api7ee-developer-portal/pull/40) [`4c400c9`](https://github.com/api7/api7ee-developer-portal/commit/4c400c93d449889beb2e9c11dd0dbc0d9c1f9f36) Thanks [@LiteSun](https://github.com/LiteSun)! - feat: update scalar version

## 0.1.0

### Minor Changes

- [#38](https://github.com/api7/api7ee-developer-portal/pull/38) [`cba6101`](https://github.com/api7/api7ee-developer-portal/commit/cba6101c26aaec31af3f1c8b18d5f8b90a57d098) Thanks [@LiteSun](https://github.com/LiteSun)! - feat: use scalar render docs

## 0.0.10

### Patch Changes

- feat: generate self signed certificate into memory by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/36

## 0.0.9

### Patch Changes

- ci: build docker image for multi architectures by @nic-6443 in https://github.com/api7/api7ee-developer-portal/pull/34

## 0.0.8

### Patch Changes

- refactor: reduce docker image size by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/32

## 0.0.7

### Patch Changes

- feat: reduce docker image by @LiteSun in https://github.com/api7/api7ee-developer-portal/pull/29

## 0.0.6

### Patch Changes

- fix: call server proxy api directly by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/27
- fix: endpoint error code process, show toast when source not exist by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/26

## 0.0.5

### Patch Changes

- fix: openapi bundle ref by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/24

## 0.0.4

### Patch Changes

- fix: env when disable ssl by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/21

## 0.0.3

### Patch Changes

- feat: https support by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/19

## 0.0.2

### Patch Changes

- fix: code block wrap line by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/17

## 0.0.1

### Patch Changes

- feat: vercel adapter, eslint by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/1
- feat: home page with slots by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/2
- feat: dynamic home page, custom theme by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/3
- feat: add api hub by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/4
- feat(api-hub): save params to url search by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/5
- feat: api hub detail by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/6
- test: api hub by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/7
- feat: docs by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/8
- fix: release tools, docs style after page switching by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/10
- docs: add `Let's Start from Here` by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/11
- chore: add @changesets/changelog-github by @SkyeYoung in https://github.com/api7/api7ee-developer-portal/pull/12

## New Contributors

- @SkyeYoung made their first contribution in https://github.com/api7/api7ee-developer-portal/pull/1

**Full Changelog**: https://github.com/api7/api7ee-developer-portal/commits/v0.1.0
