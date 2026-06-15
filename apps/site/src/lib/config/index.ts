import 'server-only';

import { lilconfigSync } from "lilconfig";
import { parse } from "yaml";
import { z } from "zod";
import { config } from "dotenv";
import { resolve } from "path";
import { configSchema, type AppConfig } from "./schema";

// Load environment variables from .env files before parsing config
// Priority: .env.local > .env
// This ensures environment variables are available for substitution in config.yaml
const envFiles = [".env.local", ".env"];
for (const envFile of envFiles) {
  const envPath = resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

/**
 * Replaces environment variable placeholders in a string.
 * 
 * Supported formats:
 * - ${VAR_NAME} - Required variable (throws error if not set)
 * - ${VAR_NAME:default} - Optional variable with default value
 * - ${VAR_NAME:${OTHER_VAR:fallback}} - Nested variables (recursively processed)
 * 
 * @param str - String containing environment variable placeholders
 * @returns String with environment variables replaced
 * @throws Error if required variable is not set and no default provided
 */
function replaceEnvVars(str: string): string {
  return str.replace(/\$\{([^}:]+)(?::([^}]*))?\}/g, (match, varName, defaultValue) => {
    const envValue = process.env[varName];
    if (envValue !== undefined) {
      return envValue;
    }
    if (defaultValue !== undefined) {
      // Recursively process nested environment variables in default value
      return replaceEnvVars(defaultValue);
    }
    throw new Error(
      `Environment variable ${varName} is not set and no default value provided`
    );
  });
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
  if (typeof obj === "string") {
    return obj.includes("${") ? replaceEnvVars(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(processEnvVars);
  }
  
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, processEnvVars(value)])
    );
  }
  
  return obj;
}

function validateConfig(config: unknown): AppConfig {
  const validated = configSchema.safeParse(config);
  if (!validated.success) {
    console.error(
      '❌ Invalid configuration:\n',
      JSON.stringify(z.treeifyError(validated.error), null, 2)
    );
    throw new Error("Configuration validation failed");
  }
  return validated.data;
}

const yamlLoader = (filepath: string, content: string) => {
  try {
    return processEnvVars(parse(content));
  } catch (error) {
    throw new Error(`Failed to parse YAML file ${filepath}: ${error}`);
  }
};

const explorer = lilconfigSync("config", {
  searchPlaces: ["config.yaml", "config.yml"],
  loaders: {
    ".yaml": yamlLoader,
    ".yml": yamlLoader,
  },
  transform: (result) => {
    if (!result) {
      return result;
    }
    return {
      ...result,
      config: validateConfig(result.config),
    };
  },
});

export function getConfig(searchFrom?: string): AppConfig {
  try {
    const result = explorer.search(searchFrom);
    
    if (!result) {
      throw new Error("Configuration file not found. Please create a config.yaml file in the project root.");
    }

    return result.config as AppConfig;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to load configuration");
  }
}

export function clearConfigCache(): void {
  explorer.clearCaches();
}
