'use server';

import { getConfig } from '@/lib/config';

import { type EmailPolicy, getEmailPolicy } from './email-policy';

export async function checkEmailPolicy(email: string): Promise<EmailPolicy> {
  const config = getConfig();
  const providers = config.auth.sso?.providers ?? [];
  return getEmailPolicy(email, providers);
}
