import type { AppConfig } from '@/lib/config/schema';

export type EmailPolicy =
  | { type: 'sso'; providerId: string }
  | { type: 'credentials' };

type SsoProvider = AppConfig['auth']['sso']['providers'][number];

const MAX_EMAIL_LENGTH = 254;

export function getEmailPolicy(
  email: string,
  providers: SsoProvider[],
): EmailPolicy {
  const emailLower = email.trim().toLowerCase();
  if (emailLower.length > MAX_EMAIL_LENGTH) {
    return { type: 'credentials' };
  }

  for (const provider of providers) {
    for (const pattern of provider.domains) {
      if (new RegExp(pattern, 'i').test(emailLower)) {
        return { type: 'sso', providerId: provider.providerId };
      }
    }
  }

  return { type: 'credentials' };
}

export function isSsoPolicyEmail(
  email: string,
  providers: SsoProvider[],
): boolean {
  return getEmailPolicy(email, providers).type === 'sso';
}
