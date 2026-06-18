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
  // Explicit schema overrides any search_path set in the connection URL options.
  ...(config.db.schema && { options: `-c search_path=${config.db.schema}` }),
});

export const db = drizzle(pool, { schema });
export { pool };
