import { expect, test } from '@playwright/test';
import { PATH_AUTH } from '@site/constants/path-prefix';
import { ConfigMapData } from '@site/lib/config/schema';
import {
  getConfigMapYaml,
  patchConfigMapYaml,
  updateConfigMapYaml,
} from '../utils/devportal-config';
import { restartDevPortal } from '../utils/shell';

const BEFORE_SIGN_UP_NOTICE_HTML = `<p>By continuing, you acknowledge Example's <a href="https://example.com/terms" target="_blank" rel="noopener noreferrer">Terms of use</a> and the <a href="https://example.com/privacy" target="_blank" rel="noopener noreferrer">Privacy policy</a>.</p>`;

test.describe('Auth sign-up slot', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(600_000);

  let defaultConfig: string | null = null;

  async function patchBeforeSignUpButtonHtml(html?: string): Promise<void> {
    await patchConfigMapYaml<ConfigMapData>((configObj) => {
      configObj.app ??= {};

      if (html === undefined) {
        delete configObj.app.beforeSignUpButtonHtml;
      } else {
        configObj.app.beforeSignUpButtonHtml = html;
      }
    });
  }

  async function updateConfigAndRestart(html?: string) {
    await patchBeforeSignUpButtonHtml(html);
    await restartDevPortal();
  }

  test.beforeAll(async () => {
    defaultConfig = await getConfigMapYaml();
  });

  test.afterAll(async () => {
    if (!defaultConfig) {
      return;
    }

    await updateConfigMapYaml(defaultConfig);
    await restartDevPortal();
  });

  test.skip('renders configured html before sign-up button', async ({ page }) => {
    // TODO Phase 2: beforeSignUpButton slot not yet wired into new Auth/SignUp components
    await updateConfigAndRestart(BEFORE_SIGN_UP_NOTICE_HTML);
    await page.goto(`${PATH_AUTH}/sign-up`);

    const notice = page.getByTestId('before-sign-up-html');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(
      /By continuing, you acknowledge Example's/i
    );

    const termsLink = notice.getByRole('link', { name: /terms of use/i });
    const privacyLink = notice.getByRole('link', { name: /privacy policy/i });

    await expect(termsLink).toHaveAttribute(
      'href',
      'https://example.com/terms'
    );
    await expect(privacyLink).toHaveAttribute(
      'href',
      'https://example.com/privacy'
    );

    const createAccountButton = page.getByRole('button', {
      name: /create an account/i,
    });
    await expect(createAccountButton).toBeVisible();

    const isNoticeBeforeSignUp = await page.evaluate(() => {
      const noticeEl = document.querySelector(
        '[data-testid="before-sign-up-html"]'
      );
      if (!noticeEl) return false;

      const form = noticeEl.closest('form');
      if (!form) return false;

      const signUpButtonEl = Array.from(form.querySelectorAll('button')).find(
        (button) => /create an account/i.test(button.textContent ?? '')
      );
      if (!signUpButtonEl) return false;

      return Boolean(
        noticeEl.compareDocumentPosition(signUpButtonEl) &
          Node.DOCUMENT_POSITION_FOLLOWING
      );
    });

    expect(isNoticeBeforeSignUp).toBeTruthy();
  });

  test('does not render notice html when not configured', async ({ page }) => {
    await updateConfigAndRestart(undefined);
    await page.goto(`${PATH_AUTH}/sign-up`);

    await expect(page.getByTestId('before-sign-up-html')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /sign up/i })
    ).toBeVisible();
  });
});
