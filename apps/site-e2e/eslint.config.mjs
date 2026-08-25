import js from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const eslintConfig = defineConfig([
  js.configs.recommended,
  tseslint.configs.recommended,
  playwright.configs['flat/recommended'],
  globalIgnores(['playwright-report/**', 'test-results/**']),
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
      // uiShowNotFound/uiShowLogin wrap real expect() calls, so they count
      // as assertions even though this rule can't see inside them by default.
      'playwright/expect-expect': [
        'warn',
        { assertFunctionNames: ['uiShowNotFound', 'uiShowLogin'] },
      ],
      // Every use here works around a real, documented overlay/z-index
      // pointer-event issue in the app UI (see the call sites), not a lazy
      // shortcut around flaky locators.
      'playwright/no-force-option': 'off',
      // Every use here waits out React hydration after an SSR'd page load
      // before interacting with the form (see utils/ui.ts's uiLogin), the
      // same reason dark-mode.spec.ts's own page.reload({ waitUntil:
      // 'networkidle' }) calls aren't flagged by this rule at all.
      'playwright/no-networkidle': 'off',
    },
  },
  {
    // Deployment verification here throws on failure instead of using
    // expect() — a manual assertion style, not a missing one. Its
    // conditionals (login retry, license activation) are deployment
    // orchestration, not test logic branching on unpredictable page state.
    files: ['src/global.setup.ts'],
    rules: {
      'playwright/expect-expect': 'off',
      'playwright/no-conditional-in-test': 'off',
    },
  },
]);

export default eslintConfig;
