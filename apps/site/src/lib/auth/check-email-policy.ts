'use server'

import { getConfig } from '@/lib/config'

export type EmailPolicy =
  | { type: 'sso'; providerId: string }
  | { type: 'credentials' }

const MAX_EMAIL_LENGTH = 254

export async function checkEmailPolicy(email: string): Promise<EmailPolicy> {
  const config = getConfig()
  const providers = config.auth.sso?.providers ?? []
  const emailLower = email.trim().toLowerCase()
  if (emailLower.length > MAX_EMAIL_LENGTH) {
    return { type: 'credentials' }
  }
  for (const provider of providers) {
    for (const pattern of provider.domains) {
      if (new RegExp(pattern, 'i').test(emailLower)) {
        return { type: 'sso', providerId: provider.providerId }
      }
    }
  }
  return { type: 'credentials' }
}
