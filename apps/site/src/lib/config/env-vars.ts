// Replaces ${VAR}, ${VAR:default}, and nested ${VAR:${OTHER:fallback}} placeholders by walking brace-depth (a regex can't match nested closing braces correctly).
export function replaceEnvVars(str: string): string {
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
