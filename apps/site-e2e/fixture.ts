import fs from 'node:fs';
import path from 'node:path';

import { Page, test as baseTest } from '@playwright/test';

import { PROVIDER_UI_PREFIX } from './constant';
import {
  Ctx,
  createOrganization,
  genCtx,
  getSession,
  login,
} from './req/common';
import {
  A7Ctx,
  a7ActivateLicenseAndChangePasswd,
  a7GenCtx,
} from './req/dashboard/common';
import { BetterAuthLogin } from './req/type';

export const genAuth = (id: string): BetterAuthLogin => {
  return {
    password: `Password3412.${id}`,
    email: `user${id}@test.example.com`,
    name: id,
    organization: `org-${id}-${+Date.now()}`,
  };
};

const genA7StateFilePath = (p: string) => {
  const file = path.resolve(p, `.auth/dashboard.json`);
  return {
    file,
    options: fs.existsSync(file) ? { storageState: file } : {},
  };
};

const { A7_ROOT_USERNAME, A7_ROOT_PASSWORD, A7_URL } = process.env;
if (!A7_ROOT_USERNAME) throw new Error('env A7_ROOT_USERNAME is not set');
if (!A7_ROOT_PASSWORD) throw new Error('env A7_ROOT_PASSWORD is not set');

const a7AuthConf = {
  httpCredentials: {
    username: A7_ROOT_USERNAME,
    password: A7_ROOT_PASSWORD,
    send: 'always',
  },
} as const;

export const test = baseTest.extend<
  { a7Ctx: A7Ctx; ctx: Ctx; a7UIPage: Page },
  { workerStorageState: string; auth: BetterAuthLogin }
>({
  auth: [
    async ({}, use) => {
      const idx = test.info().parallelIndex;
      // Use a stable ID based on worker index to allow reuse of registered accounts
      const id = `worker${idx}`;
      const auth = { ...genAuth(id), id };
      await use(auth);
    },
    { scope: 'worker' },
  ],
  storageState: ({ workerStorageState }, use) => use(workerStorageState),
  workerStorageState: [
    async ({ auth }, use) => {
      console.log('auth', auth);
      const fileName = path.resolve(
        test.info().project.outputDir,
        `.auth/${auth.id}.json`,
      );
      const ctx = await genCtx();
      await login(ctx, auth);
      await createOrganization(ctx, auth.organization);
      await ctx.storageState({ path: fileName });
      await ctx.dispose();

      await use(fileName);
    },
    { scope: 'worker' },
  ],
  a7Ctx: async ({ browser }, use) => {
    const a7Ctx = await a7GenCtx(a7AuthConf);
    await a7ActivateLicenseAndChangePasswd(a7Ctx);
    await use(a7Ctx);
  },
  ctx: async ({ storageState }, use) => {
    const ctx = await genCtx({ storageState });
    await use(ctx);
  },
  a7UIPage: [
    async ({ browser }, use) => {
      const { options } = genA7StateFilePath(test.info().project.outputDir);

      const login = async () => {
        const a7Ctx = await a7GenCtx(options);
        try {
          await a7ActivateLicenseAndChangePasswd(a7Ctx);
          return await a7Ctx.storageState();
        } finally {
          await a7Ctx.dispose();
        }
      };

      const storageState = await login();
      const context = await browser.newContext({
        baseURL: A7_URL,
        ignoreHTTPSErrors: true,
        storageState,
      });
      const sharedPage = await context.newPage();
      await sharedPage.goto(PROVIDER_UI_PREFIX);
      await sharedPage
        .locator('#menu-item-APIExposure')
        .getByText('API Products')
        .click();
      // Previously matched concatenated text 'API7 Provider PortalOrganizationa'
      // spanning the logo and the org dropdown — those aren't adjacent in the
      // DOM (a "Control Plane: ..." label sits between them), and text= only
      // matches contiguous text, so that locator no longer matches at all.
      // Anchor on the API Products page actually having loaded instead.
      await sharedPage
        .getByRole('button', { name: 'Add API Product' })
        .waitFor({ timeout: 15_000 });
      let lock401 = false;
      sharedPage.on('response', async (res) => {
        if (res.status() === 401 && !lock401) {
          console.log('401, try to login');
          lock401 = true;
          try {
            const state = await login();
            await context.clearCookies();
            await context.addCookies(state.cookies);
            await sharedPage.reload();
          } finally {
            lock401 = false;
          }
        }
      });
      await use(sharedPage);
      await sharedPage.close();
      await context.close();
    },
    // Logs into the gateway's own Provider Portal console and waits for its
    // nav to render — under CI load this routinely blows the implicit 30s
    // default. `test.setTimeout()` inside a test body doesn't help here: it
    // only takes effect once the test body starts running, which is after
    // fixture setup has already completed (or timed out). This needs its
    // own explicit fixture-level timeout.
    { timeout: 60_000 },
  ],
});
