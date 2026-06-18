/**
 * Post-process drizzle-kit generated migration SQL to remove the hardcoded
 * "public". schema prefix.  drizzle-kit always emits "public"."tablename" for
 * pgTable() definitions; we strip it so migrations rely on search_path instead,
 * keeping them schema-agnostic and consistent with the existing migration files.
 *
 * Run automatically via the db:generate npm script — do not run standalone.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const drizzleDir = fileURLToPath(new URL('../drizzle/', import.meta.url));

const sqlFiles = readdirSync(drizzleDir).filter((f) => f.endsWith('.sql'));
let changed = 0;

for (const file of sqlFiles) {
  const path = join(drizzleDir, file);
  const original = readFileSync(path, 'utf-8');
  const stripped = original.replace(/"public"\./g, '');
  if (stripped !== original) {
    writeFileSync(path, stripped);
    console.log(`strip-public-schema: cleaned ${file}`);
    changed++;
  }
}

if (changed === 0) {
  console.log('strip-public-schema: nothing to clean');
}
