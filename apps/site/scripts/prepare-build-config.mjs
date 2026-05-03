import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(siteDir, 'config.yaml.example');
const target = resolve(siteDir, 'config.yaml');

if (existsSync(target)) {
  process.exit(0);
}

let config = readFileSync(source, 'utf8');

config = config
  .replace(
    'url: ""',
    'url: "postgres://placeholder:placeholder@localhost:5432/placeholder"'
  )
  .replace(
    'secret: ""',
    'secret: "build-time-placeholder-secret-key-min-32-chars-long"'
  )
  .replace(
    'token: ${PORTAL_TOKEN:}',
    'token: ${PORTAL_TOKEN:build-time-placeholder}'
  );

writeFileSync(target, config);
