import { createAuthPlugin } from "@better-auth-ui/core"
import {
  twoFactorPlugin as coreTwoFactorPlugin,
  type TwoFactorPluginOptions
} from "@better-auth-ui/core/plugins/two-factor"

import { TwoFactorChallenge } from "@api7/portal-ui/components/auth/two-factor/two-factor-challenge"
import { TwoFactorSettings } from "@api7/portal-ui/components/auth/two-factor/two-factor-settings"

export type TwoFactorPluginPaths = {
  /** Mandatory/voluntary enrollment page — the app's own route, not a `viewPaths` entry. */
  setup?: string
  /** Where `TwoFactorSettings`'s Enable/Reset buttons send the user back after setup. */
  security?: string
}

export const twoFactorPlugin = createAuthPlugin(
  coreTwoFactorPlugin.id,
  (options: TwoFactorPluginOptions & { paths?: TwoFactorPluginPaths } = {}) => {
    const { paths, ...coreOptions } = options

    return {
      ...coreTwoFactorPlugin(coreOptions),
      paths: {
        setup: paths?.setup ?? "/account/two-factor",
        security: paths?.security ?? "/account/security"
      },
      securityCards: [TwoFactorSettings],
      views: {
        auth: { twoFactor: TwoFactorChallenge }
      }
    }
  }
)
