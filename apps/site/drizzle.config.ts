import { defineConfig } from "drizzle-kit";
import { getConfig } from './src/lib/config';

const config = getConfig();
const dbSchema = config.db.schema;

// When db.schema is configured, inject search_path into the URL so drizzle-kit
// CLI commands (db:generate, db:migrate) operate on the correct schema.
function withSearchPath(url: string, schema: string): string {
  try {
    const u = new URL(url);
    // Strip any existing search_path to avoid duplicates or stale values, then
    // always set the one from config so CLI behaviour matches runtime Pool options.
    const existing = (u.searchParams.get('options') ?? '')
      .replace(/-c\s+search_path=\S+\s*/g, '')
      .trim();
    const opts = existing
      ? `${existing} -c search_path=${schema}`
      : `-c search_path=${schema}`;
    u.searchParams.set('options', opts);
    return u.toString();
  } catch (err) {
    throw new Error(
      `[drizzle] Failed to inject search_path into db.url for schema "${schema}": ` +
      (err instanceof Error ? err.message : String(err)),
    );
  }
}

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbSchema ? withSearchPath(config.db.url, dbSchema) : config.db.url,
  },
  verbose: true,
  strict: true,
  migrations: {
    table: '__drizzle_migrations',
    schema: dbSchema ?? 'public',
  },
});
