import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { config } from 'dotenv';
import { parse } from 'yaml';
import { z } from 'zod';

import { type AppConfig, configSchema } from './schema';

// Loads .env files (priority: .env.local > .env) for substitution in
// config.yaml. Deferred into loadConfig's closure instead of module scope,
// so nothing runs on import alone.
let envLoaded = false;
function loadEnvFiles(): void {
  if (envLoaded) return;
  envLoaded = true;
  for (const envFile of ['.env.local', '.env']) {
    config({ path: resolve(process.cwd(), envFile), override: false });
  }
}

// Replaces ${VAR}, ${VAR:default}, and ${VAR:${OTHER:fallback}} placeholders.
// Walks brace-depth manually instead of a regex, since a nested `${...}`
// default has its own closing `}` that a regex can't tell apart from the
// outer one — matching only up to the first `}` truncates the nested form.
function replaceEnvVars(str: string): string {
  let result = '';
  let i = 0;
  while (i < str.length) {
    if (str[i] !== '$' || str[i + 1] !== '{') {
      result += str[i];
      i++;
      continue;
    }

    let depth = 1;
    let j = i + 2;
    while (j < str.length && depth > 0) {
      if (str[j] === '{') depth++;
      else if (str[j] === '}') depth--;
      if (depth > 0) j++;
    }
    if (depth !== 0) {
      // No matching close brace — leave the rest of the string untouched.
      result += str.slice(i);
      break;
    }

    const inner = str.slice(i + 2, j);
    let colonAt = -1;
    let innerDepth = 0;
    for (let k = 0; k < inner.length; k++) {
      if (inner[k] === '{') innerDepth++;
      else if (inner[k] === '}') innerDepth--;
      else if (inner[k] === ':' && innerDepth === 0) {
        colonAt = k;
        break;
      }
    }
    const varName = colonAt === -1 ? inner : inner.slice(0, colonAt);
    const defaultValue = colonAt === -1 ? undefined : inner.slice(colonAt + 1);

    const envValue = process.env[varName];
    if (envValue !== undefined) {
      result += envValue;
    } else if (defaultValue !== undefined) {
      result += replaceEnvVars(defaultValue);
    } else {
      throw new Error(
        `Environment variable ${varName} is not set and no default value provided`,
      );
    }
    i = j + 1;
  }
  return result;
}

/**
 * Recursively processes environment variable substitutions in configuration object.
 *
 * Processes all string values in the object tree, replacing:
 * - ${VAR_NAME} with environment variable values
 * - ${VAR_NAME:default} with environment variable values or defaults
 *
 * @param obj - Configuration object (can be any type)
 * @returns Processed object with environment variables replaced
 */
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

// Walks up from `searchFrom` (or cwd) to the filesystem root looking for
// config.yaml/config.yml.
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

/**
 * Loads and validates `config.yaml`. Pure Node — no bundler/runtime
 * assumptions — so it's safe to call from plain CLI tooling (e.g.
 * `drizzle.config.ts`) as well as from the app's own server-only `getConfig`.
 */
export const loadConfig = (searchFrom?: string): AppConfig => {
  if (cachedConfig) return cachedConfig;

  loadEnvFiles();

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
    throw new Error(`Failed to parse YAML file ${filepath}: ${error}`, {
      cause: error,
    });
  }

  cachedConfig = validateConfig(raw);
  return cachedConfig;
};

export function clearConfigCache(): void {
  cachedConfig = undefined;
}
