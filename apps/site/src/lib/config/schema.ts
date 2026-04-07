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
    secret: z.string().min(1, 'Auth secret is required'),
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
  }),
  app: z
    .object({
      name: z.string().default('Developer Portal'),
      baseURL: z.url().default('http://localhost:3001'),
      trustedOrigins: z.array(z.string()).default(['http://localhost:3001']),
      desc: z
        .string()
        .default(
          'Explore and integrate with our APIs. Access documentation, manage applications, and discover products.'
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
      beforeSignUpButtonHtml: z
        .string()
        .optional()
        .describe(
          'Optional HTML rendered before the Sign Up button. Only use trusted static content.'
        ),
    })
    .partial()
    .prefault({}),
});

export type AppConfig = z.infer<typeof configSchema>;

export type ConfigMapData = Pick<
  AppConfig,
  'app' | 'db' | 'portal' | 'auth'
>;
