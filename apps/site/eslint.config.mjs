import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const eslintConfig = defineConfig([
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  globalIgnores([
    '.output/**',
    '.tanstack/**',
    'dist/**',
    'src/routeTree.gen.ts',
    // Vendored shadcn / better-auth-ui registry code, overwritten on re-fetch.
    'src/components/ui/**',
    'src/components/auth/**',
  ]),
  {
    // TanStack Start is isomorphic — the same `src/**` tree runs both in the
    // browser and (via server functions / SSR) in Node, so both global sets
    // apply rather than a directory-based split.
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
      'unused-imports/no-unused-imports': 'error',
    },
  },
  {
    // TanStack Router's file-based routing convention pairs a `Route`
    // export with its component in the same file by design — not a
    // fast-refresh hazard, just how the framework works.
    files: ['src/routes/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);

export default eslintConfig;
