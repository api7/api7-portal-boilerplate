import { createAuthPlugin } from "@better-auth-ui/core"

import { TwoFactorCard } from "@/components/auth/two-factor/two-factor-card"
import { TwoFactorView } from "@/components/auth/two-factor/two-factor-view"

declare module "@better-auth-ui/core" {
  interface AuthViewPaths {
    /** @default "two-factor" */
    twoFactor?: string
  }
}

export const twoFactorPlugin = createAuthPlugin("two-factor", () => ({
  viewPaths: {
    auth: { twoFactor: "two-factor" }
  },
  views: {
    auth: { twoFactor: TwoFactorView }
  },
  securityCards: [TwoFactorCard]
}))
