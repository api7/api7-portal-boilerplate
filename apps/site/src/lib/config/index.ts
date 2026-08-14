import 'server-only';

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { config } from 'dotenv';
import { parse } from 'yaml';
import { z } from 'zod';

import { replaceEnvVars } from './env-vars';
import { type AppConfig, configSchema } from './schema';

// Load .env.local then .env so config.yaml's ${VAR} substitution can see them.
const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

// Recursively substitutes ${VAR}/${VAR:default} placeholders in every string value.
function processEnvVars(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.includes('${') ? replaceEnvVars(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(processEnvVars);
  }

  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, processEnvVars(value)]),
    );
  }

  return obj;
}

function validateConfig(config: unknown): AppConfig {
  const validated = configSchema.safeParse(config);
  if (!validated.success) {
    console.error(
      '❌ Invalid configuration:\n',
      JSON.stringify(z.treeifyError(validated.error), null, 2),
    );
    throw new Error('Configuration validation failed');
  }
  return validated.data;
}

const CONFIG_FILENAMES = ['config.yaml', 'config.yml'];

// Walks up from `searchFrom` (or cwd) to the filesystem root looking for config.yaml/config.yml.
function findConfigFile(searchFrom?: string): string | undefined {
  let dir = resolve(searchFrom ?? process.cwd());
  while (true) {
    for (const name of CONFIG_FILENAMES) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

let cachedConfig: AppConfig | undefined;

export function getConfig(searchFrom?: string): AppConfig {
  if (cachedConfig) return cachedConfig;

  const filepath = findConfigFile(searchFrom);
  if (!filepath) {
    throw new Error(
      'Configuration file not found. Please create a config.yaml file in the project root.',
    );
  }

  let raw: unknown;
  try {
    raw = processEnvVars(parse(readFileSync(filepath, 'utf-8')));
  } catch (error) {
    throw new Error(`Failed to parse YAML file ${filepath}: ${error}`);
  }

  cachedConfig = validateConfig(raw);
  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = undefined;
}
