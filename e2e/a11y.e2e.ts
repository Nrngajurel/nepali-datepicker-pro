import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Automated accessibility checks (axe-core, WCAG 2.2 A/AA) on every picker,
// closed and open, in each view. Any serious or critical violation fails.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// axe is slow in Firefox, especially with other workers running.
test.describe.configure({ timeout: 90_000 });

test.beforeEach(async ({ page }) => {
  await page.goto('/e2e/index.html');
  await page.waitForFunction(() => window.ready === true);
  // Motion off: axe measures contrast mid-animation otherwise.
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function audit(page: Page, include?: string): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags(TAGS);
  if (include) builder = builder.include(include);
  const { violations } = await builder.analyze();
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = blocking.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n  ')}`).join('\n');
  expect(blocking, report).toEqual([]);
}

test('closed fields', async ({ page }) => {
  await audit(page, 'form');
});

/** Open a picker; returns the CSS selector of its popup (the field's aria-controls). */
async function open(page: Page, id: string): Promise<string> {
  await page.locator(`#${id}`).click();
  const popup = `#${await page.locator(`#${id}`).getAttribute('aria-controls')}`;
  await expect(page.locator(`${popup} .ndp-panel`)).toBeVisible();
  return popup;
}

for (const id of ['date', 'datetime', 'range', 'month', 'year', 'time', 'multi', 'range2']) {
  test(`${id} picker open`, async ({ page }) => {
    await audit(page, await open(page, id));
  });
}

test('month and year views', async ({ page }) => {
  const popup = await open(page, 'date');
  const root = page.locator(popup);
  await root.locator('.ndp-cal-label').first().click();
  await expect(root.locator('.ndp-monthgrid')).toBeVisible();
  await audit(page, popup);
  await root.locator('.ndp-cal-label').first().click();
  await expect(root.locator('.ndp-yeargrid')).toBeVisible();
  await audit(page, popup);
});

test('dark theme', async ({ page }) => {
  await page.evaluate(() => document.documentElement.setAttribute('data-ndp-theme', 'dark'));
  await audit(page, await open(page, 'range'));
});
