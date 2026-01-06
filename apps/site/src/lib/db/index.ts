import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getConfig } from '@/lib/config';
import * as schema from '@/lib/db/schema';

const config = getConfig();

const pool = new Pool({
  connectionString: config.db.url,
  max: config.db.pool.max,
  min: config.db.pool.min,
  idleTimeoutMillis: config.db.pool.idleTimeout,
  connectionTimeoutMillis: config.db.pool.connectionTimeout,
  allowExitOnIdle: config.db.pool.allowExitOnIdle,
  ssl: config.db.ssl,
});

export const db = drizzle(pool, { schema });
export { pool };
