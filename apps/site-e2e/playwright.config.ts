import { config } from 'dotenv';

import { defineConfig, devices } from '@playwright/test';

import { E2E_TARGET_URL } from './constant';

config({
  path: ['./.env', './.env.local', './.env.development.local'],
});

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = E2E_TARGET_URL;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './src',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 2,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['github'],
    ['list'],
    [
      '@estruyf/github-actions-reporter',
      {
        useDetails: true,
        showError: true,
      },
    ],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    video: 'on',
  },
  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  //   cwd: workspaceRoot,
  // },
  outputDir: './test-results',
  projects: [
    {
      name: 'unit',
      testMatch: /unit\/.*\.spec\.ts/,
    },
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: /unit\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        permissions: ['clipboard-read'],
        launchOptions: {
          args: [
            '--ignore-certificate-errors',
            // Map docker container hostnames to localhost so the browser can reach them
            '--host-resolver-rules=MAP api7ee3-keycloak 127.0.0.1',
          ],
        },
        // use chrome
        // channel: "chrome",
      },
    },
  ],
});
