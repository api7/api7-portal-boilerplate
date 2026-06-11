// eslint-disable-next-line @typescript-eslint/no-require-imports
const safeRegex = require('safe-regex2') as (pattern: string | RegExp) => boolean

import { z } from 'zod';

export const configSchema = z.object({
  portal: z.object({
    url: z.string().min(1, 'Portal URL is required'),
    token: z.string().min(1, 'Portal Token is required'),
  }),
  db: z.object({
    url: z.string().min(1, 'Database URL is required'),
    pool: z
      .object({
        max: z.number().int().positive(),
        min: z.number().int().nonnegative(),
        idleTimeout: z.number().int().positive(),
        connectionTimeout: z.number().int().positive(),
        allowExitOnIdle: z.boolean(),
      })
      .optional()
      .default({
        max: 20,
        min: 0,
        idleTimeout: 30000,
        connectionTimeout: 2000,
        allowExitOnIdle: false,
      }),
    ssl: z
      .union([
        z.boolean(),
        z.object({
          rejectUnauthorized: z.boolean().default(true),
          ca: z.string().optional(),
          cert: z.string().optional(),
          key: z.string().optional(),
        }),
      ])
      .optional()
      .default(false),
  }),
  auth: z.object({
    secret: z
      .string()
      .min(32, 'Auth secret must be at least 32 characters long'),
    adminUserIds: z.array(z.string().min(1)).default([]),
    session: z
      .object({
        expiresIn: z.number().int().positive(),
        updateAge: z.number().int().positive(),
      })
      .optional()
      .default({
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
      }),
    emailAndPassword: z
      .object({
        enabled: z.boolean(),
        requireEmailVerification: z.boolean(),
      })
      .default({
        enabled: true,
        requireEmailVerification: false,
      }),
    twoFactor: z
      .object({
        enabled: z.boolean().default(false),
      })
      .prefault({}),
    socialProviders: z.record(z.string(), z.object(z.any())).optional(),
    genericOAuthProviders: z
      .array(
        z.looseObject({
          providerId: z.string(),
          discoveryUrl: z.url(),
          clientId: z.string(),
          clientSecret: z.string(),
          scopes: z.array(z.string()).default(['openid', 'profile', 'email']),
          pkce: z.boolean().default(true),
          requireIssuerValidation: z.boolean().default(true),
          ssoOnly: z.boolean().default(false),
        }),
      )
      .default([]),
    sso: z
      .strictObject({
        providers: z
          .array(
            z.strictObject({
              domains: z.array(
                z.string().refine((val) => {
                  const trimmed = val.trim()
                  if (trimmed.length === 0 || trimmed.length > 200) return false
                  try {
                    const re = new RegExp(trimmed)
                    return safeRegex(re)
                  } catch {
                    return false
                  }
                }, "must be a valid, safe regular expression ≤200 chars (e.g. '@example\\\\.com$')"),
              ),
              providerId: z.string(),
            }),
          )
          .default([]),
      })
      .default({ providers: [] }),
  }),
  app: z
    .object({
      name: z.string().default('Developer Portal'),
      baseURL: z.url().default('http://localhost:3001'),
      trustedOrigins: z.array(z.string()).default(['http://localhost:3001']),
      desc: z
        .string()
        .default(
          'Explore and integrate with our APIs. Access documentation, manage applications, and discover products.',
        ),
      applicationDetail: z
        .object({
          subscriptions: z.boolean().default(true),
          usage: z.boolean().default(true),
          credentialsTabs: z
            .object({
              keyAuth: z.boolean().default(true),
              basicAuth: z.boolean().default(true),
              oauth: z.boolean().default(true),
            })
            .prefault({}),
        })
        .prefault({}),
      tosURL: z
        .url()
        .optional()
        .describe(
          'URL of the Terms of Service page. When set, users must accept the terms before signing up.',
        ),
      beforeSignUpButtonHtml: z
        .string()
        .optional()
        .describe(
          'Optional HTML rendered before the Sign Up button. Only use trusted static content.',
        ),
    })
    .partial()
    .prefault({}),
});

export type AppConfig = z.infer<typeof configSchema>;

export type ConfigMapData = Pick<AppConfig, 'app' | 'db' | 'portal' | 'auth'>;
