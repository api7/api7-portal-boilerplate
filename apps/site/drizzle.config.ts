import { defineConfig } from "drizzle-kit";
import { getConfig } from './src/lib/config';

const config = getConfig();

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.db.url,
  },
  verbose: true,
  strict: true,
  // Enable migrations
  migrations: {
    table: '__drizzle_migrations',
    schema: './drizzle',
  },
});

