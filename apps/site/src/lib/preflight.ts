import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

import { API_PUBLIC_ACCESS } from '@/constants/api-prefix';
import { getConfig } from '@/lib/config';
import type { AppConfig } from '@/lib/config/schema';

async function checkPortal(portalConfig: { url: string; token: string }) {
  console.log(`Portal URL: ${portalConfig.url}`);
  console.log('Checking portal connection...');

  const response = await fetch(`${portalConfig.url}${API_PUBLIC_ACCESS}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${portalConfig.token}`,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  await response.json();
  console.log('Portal connection successful');
}

async function checkAndMigrateDb(dbConfig: AppConfig['db']) {
  console.log('Connecting to database...');
  const pool = new Pool({
    connectionString: dbConfig.url,
    max: dbConfig.pool?.max,
    min: dbConfig.pool?.min,
    idleTimeoutMillis: dbConfig.pool?.idleTimeout,
    connectionTimeoutMillis: dbConfig.pool?.connectionTimeout,
    allowExitOnIdle: dbConfig.pool?.allowExitOnIdle,
    ssl: dbConfig.ssl,
    // Explicit schema overrides any search_path set in the connection URL.
    ...(dbConfig.schema && { options: `-c search_path=${dbConfig.schema}` }),
  });

  const client = await pool.connect();
  client.release();
  console.log('Database connection successful');

  const db = drizzle(pool);

  console.log('Running migrations...');
  await migrate(db, {
    migrationsFolder: './drizzle',
    migrationsTable: '__drizzle_migrations',
    migrationsSchema: dbConfig.schema ?? 'public',
  });
  console.log('Migrations completed!');

  await pool.end();
}

export async function runPreflightChecks() {
  console.log('Loading configuration...');
  const config = getConfig();

  await checkPortal(config.portal);
  await checkAndMigrateDb(config.db);

  console.log('Preflight checks completed!');
}
