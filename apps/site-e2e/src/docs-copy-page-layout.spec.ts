import { expect, test } from '@playwright/test';

/**
 * Regression test for the docs "Copy page" split button's layout.
 *
 * The button shares a flex row with the page title. It used to be shrinkable,
 * so a title wide enough to claim the row squeezed the button below its
 * intrinsic width and the "Copy page" label wrapped onto two lines. It now
 * keeps its width, drops onto a row of its own when the title leaves no room
 * beside it, and sits centred on the title's first line rather than flush with
 * the top of the title's line box.
 *
 * `/docs` is fully public (no login / backend), so we use the bare Playwright
 * `test` rather than the auth fixture.
 */
test.describe('docs "Copy page" button layout', () => {
  type Box = { left: number; right: number; top: number; bottom: number };
  type Geometry = {
    labelHeight: number;
    labelLineHeight: number;
    button: Box;
    title: Box;
    titleFirstLine: Box;
    row: Box;
  };

  const centre = (box: Box) => (box.top + box.bottom) / 2;

  const measure = (page: import('@playwright/test').Page) =>
    page.evaluate<Geometry>(() => {
      const label = Array.from(document.querySelectorAll('button')).find(
        (el) => el.textContent?.trim() === 'Copy page',
      )!;
      // The split button wraps the label and the dropdown trigger; its row
      // holds the page title alongside it.
      const button = label.parentElement!;
      const row = button.parentElement!;
      const rect = ({ left, right, top, bottom }: DOMRect): Box => ({
        left,
        right,
        top,
        bottom,
      });
      const box = (el: Element): Box => rect(el.getBoundingClientRect());

      const title = row.querySelector('h1')!;
      const titleLines = document.createRange();
      titleLines.selectNodeContents(title);

      return {
        labelHeight: label.getBoundingClientRect().height,
        labelLineHeight: Number.parseFloat(getComputedStyle(label).lineHeight),
        button: box(button),
        title: box(title),
        titleFirstLine: rect(titleLines.getClientRects()[0]),
        row: box(row),
      };
    });

  const openDocsAt = async (
    page: import('@playwright/test').Page,
    width: number,
  ) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/docs/getting-started');
    await expect(page.getByRole('button', { name: 'Copy page' })).toBeVisible();
  };

  test('keeps the label on a single line when the title crowds it', async ({
    page,
  }) => {
    await openDocsAt(page, 375);

    const { labelHeight, labelLineHeight } = await measure(page);
    expect(labelHeight).toBeLessThan(labelLineHeight * 2);
  });

  test('is not clipped by the title row on narrow viewports', async ({
    page,
  }) => {
    await openDocsAt(page, 320);

    const { button, row } = await measure(page);
    expect(button.right).toBeLessThanOrEqual(row.right);
  });

  test('sits beside the title on wide viewports', async ({ page }) => {
    await openDocsAt(page, 1440);

    const { button, title } = await measure(page);
    expect(button.left).toBeGreaterThanOrEqual(title.right);
    expect(button.top).toBeLessThan(title.bottom);
  });

  test('is centred on the first line of the title', async ({ page }) => {
    await openDocsAt(page, 1440);

    const { button, titleFirstLine } = await measure(page);
    expect(
      Math.abs(centre(button) - centre(titleFirstLine)),
    ).toBeLessThanOrEqual(1);
  });
});
