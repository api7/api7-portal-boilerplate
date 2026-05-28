import { existsSync } from 'fs';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

import { API_PUBLIC_ACCESS } from '../src/constants/api-prefix';
import { getConfig } from '../src/lib/config';

// In Docker, cwd is /app but config.yaml is at /app/apps/site/config.yaml
// Locally, cwd is apps/site where config.yaml exists
const CONFIG_SEARCH_PATH = existsSync('apps/site') ? 'apps/site' : undefined;

async function checkPortal(portalConfig: { url: string; token: string }) {
  console.log(`Portal URL: ${portalConfig.url}`);
  console.log('Checking portal connection...');

  const response = await fetch(`${portalConfig.url}${API_PUBLIC_ACCESS}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${portalConfig.token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  await response.json();
  console.log('Portal connection successful');
}

async function checkAndMigrateDb(dbConfig: {
  url: string;
  pool?: object;
  ssl?: boolean | object;
}) {
  console.log('Connecting to database...');
  const pool = new Pool({
    connectionString: dbConfig.url,
    ...dbConfig.pool,
    ssl: dbConfig.ssl,
  });

  const client = await pool.connect();
  client.release();
  console.log('Database connection successful');

  const db = drizzle(pool);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations completed!');

  await pool.end();
}

async function preflight() {
  console.log('Loading configuration...');
  const config = getConfig(CONFIG_SEARCH_PATH);

  await checkPortal(config.portal);
  await checkAndMigrateDb(config.db);

  console.log('Preflight checks completed!');
}

preflight()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Preflight failed:', err);
    process.exit(1);
  });
