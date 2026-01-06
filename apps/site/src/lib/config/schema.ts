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
    })
    .partial()
    .prefault({}),
});

export type AppConfig = z.infer<typeof configSchema>;
