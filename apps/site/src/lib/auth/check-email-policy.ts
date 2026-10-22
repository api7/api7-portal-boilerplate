import { createServerFn } from '@tanstack/react-start';
import z from 'zod';

import { getEmailPolicy } from '@/lib/auth/email-policy';
import { getConfig } from '@/lib/config';

export const checkEmailPolicy = createServerFn({ method: 'POST' })
  .validator(z.email())
  .handler(async ({ data: email }) => {
    const config = getConfig();
    const providers = config.auth.sso?.providers ?? [];
    return getEmailPolicy(email, providers);
  });
