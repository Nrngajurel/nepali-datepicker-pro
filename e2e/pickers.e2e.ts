import { expect, test, type Locator, type Page } from '@playwright/test';

// Runs in two projects (playwright.config.ts): 'desktop' — the popup is a
// dropdown under the input — and 'phone' (Pixel 7, 412px) — the popup is a
// bottom sheet. Assertions branch on `isPhone` only where the layouts differ.

const NE_DIGITS = '०१२३४५६७८९';
const ne = (n: number) => String(n).replace(/\d/g, (d) => NE_DIGITS[Number(d)]);

declare global {
  interface Window {
    ready: boolean;
    changes: Record<'date' | 'datetime' | 'range' | 'month', unknown[]>;
    pickers: Record<'date' | 'datetime' | 'range' | 'month', { getValue(): any; show(): void; hide(): void }>;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/e2e/index.html');
  await page.waitForFunction(() => window.ready === true);
});

/** The open popup (portal) — only one is open at a time in these tests. */
function popup(page: Page): Locator {
  return page.locator('.ndp-panel-root:visible');
}

async function open(page: Page, id: string): Promise<Locator> {
  await page.locator(`#${id}`).click();
  const root = popup(page);
  await expect(root.locator('.ndp-panel')).toBeVisible();
  await settle(root);
  return root;
}

/** Wait for the sheet's slide-up / backdrop fade so boxes are measured at rest.
 *  Polls until nothing is animating: a re-render during the slide replaces the
 *  panel element (cancelling the animation a one-shot `finished` would await). */
async function settle(root: Locator): Promise<void> {
  await expect.poll(() => root.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
}

/** Panel box must sit fully inside the viewport. */
async function expectInViewport(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  const vp = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-0.5);
  expect(box!.y).toBeGreaterThanOrEqual(-0.5);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 0.5);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 0.5);
}

/** Header label → month view → year view. */
async function openYearView(root: Locator): Promise<Locator> {
  await root.locator('.ndp-cal-label').first().click();
  await expect(root.locator('.ndp-monthgrid')).toBeVisible();
  await root.locator('.ndp-cal-label').first().click();
  const grid = root.locator('.ndp-yeargrid');
  await expect(grid).toBeVisible();
  return grid;
}

test.describe('layout', () => {
  test('date picker popup fits the viewport, as a dropdown or a bottom sheet', async ({ page, isMobile }) => {
    const root = await open(page, 'date');
    const panel = root.locator('.ndp-panel');
    await expectInViewport(page, panel);
    const vp = page.viewportSize()!;
    const box = (await panel.boundingBox())!;
    if (isMobile) {
      await expect(root).toHaveClass(/ndp-sheet/);
      expect(Math.round(box.width)).toBe(vp.width);
      expect(Math.round(box.y + box.height)).toBe(vp.height);
    } else {
      await expect(root).not.toHaveClass(/ndp-sheet/);
      const input = (await page.locator('#date').boundingBox())!;
      expect(box.y).toBeGreaterThan(input.y + input.height - 1);
    }
  });

  test('every picker fits the viewport and has no horizontal overflow', async ({ page }) => {
    for (const id of ['date', 'datetime', 'range', 'month']) {
      const root = await open(page, id);
      const panel = root.locator('.ndp-panel');
      await expectInViewport(page, panel);
      const overflow = await panel.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflow, `${id} panel overflows horizontally`).toBeLessThanOrEqual(1);
      await page.keyboard.press('Escape');
      await page.evaluate((key) => window.pickers[key as 'date'].hide(), id);
      await expect(root).toHaveCount(0);
    }
  });

  test('datetime: desktop shows date + time side by side; phones go date → time in two steps', async ({ page, isMobile }) => {
    const root = await open(page, 'datetime');
    if (!isMobile) {
      await expect(root.locator('.ndp-grid')).toBeVisible();
      await expect(root.locator('.ndp-time-panel')).toBeVisible();
      await expect(root.locator('.ndp-time-entry')).toBeVisible(); // typed entry on desktop
      await expect(root.locator('.ndp-apply', { hasText: 'Done' })).toBeInViewport({ ratio: 1 });
      return;
    }
    // Step 1: calendar only, with Next.
    await expect(root.locator('.ndp-time-panel')).toHaveCount(0);
    const next = root.locator('.ndp-apply', { hasText: 'Next' });
    await expect(next).toBeInViewport({ ratio: 1 });
    // Picking a day moves on to step 2 by itself.
    await root.locator('.ndp-cell:not(.ndp-cell--empty) .ndp-cell-primary', { hasText: new RegExp(`^${ne(10)}$`) }).click();
    await expect(root.locator('.ndp-time-step')).toBeVisible();
    await expect(root.locator('.ndp-grid')).toHaveCount(0);
    await expect(root.locator('.ndp-step-date-primary')).toHaveText(`${ne(10)} बैशाख ${ne(2081)}`);
    await expect(root.locator('.ndp-time-entry')).toHaveCount(0); // wheels only on touch
    const panelBox = (await root.locator('.ndp-panel').boundingBox())!;
    const timeBox = (await root.locator('.ndp-time-panel').boundingBox())!;
    expect(timeBox.width).toBeGreaterThan(panelBox.width * 0.8);
    // Pick 2 PM on the wheels, then Done.
    await root.locator('.ndp-wheel-list[aria-label="Hour"] .ndp-wheel-item', { hasText: /^02$/ }).click();
    await root.locator('.ndp-wheel-list[aria-label="AM/PM"] .ndp-wheel-item', { hasText: 'PM' }).click();
    await expect(root.locator('.ndp-time-readout')).toHaveText('02:00 PM');
    await root.locator('.ndp-apply', { hasText: 'Done' }).click();
    await expect(root).toHaveCount(0);
    const value = await page.evaluate(() => window.pickers.datetime.getValue());
    expect(value.bs).toEqual({ year: 2081, month: 1, day: 10 });
    expect(value.value).toMatch(/T14:00$/);
    expect(await page.locator('#datetime').inputValue()).toBe('2081-01-10 02:00 PM');
  });

  test('datetime phone: the date chip goes back to the calendar; reopening starts on the date step', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'two-step flow is phone-only');
    const root = await open(page, 'datetime');
    await root.locator('.ndp-apply', { hasText: 'Next' }).click(); // a value is preset, so Next is enabled
    await expect(root.locator('.ndp-time-step')).toBeVisible();
    await root.locator('.ndp-step-back').click();
    await expect(root.locator('.ndp-grid')).toBeVisible();
    await root.locator('.ndp-apply', { hasText: 'Next' }).click();
    await page.mouse.click(10, 10); // backdrop closes
    await expect(root).toHaveCount(0);
    const again = await open(page, 'datetime');
    await expect(again.locator('.ndp-grid')).toBeVisible();
  });

  test('range: presets are a swipeable chip row on phones, a side list on desktop', async ({ page, isMobile }) => {
    const root = await open(page, 'range');
    const rail = root.locator('.ndp-presets');
    const railBox = (await rail.boundingBox())!;
    const calBox = (await root.locator('.ndp-cal-col').boundingBox())!;
    if (isMobile) {
      expect(railBox.height).toBeLessThan(70);
      expect(calBox.y).toBeGreaterThanOrEqual(railBox.y + railBox.height - 1);
      const scrollable = await rail.evaluate((el) => el.scrollWidth > el.clientWidth);
      expect(scrollable).toBe(true);
    } else {
      expect(calBox.x).toBeGreaterThanOrEqual(railBox.x + railBox.width - 1);
    }
    await expect(root.locator('.ndp-apply', { hasText: 'Apply' })).toBeInViewport({ ratio: 1 });
  });
});

test.describe('closing', () => {
  test('tapping outside closes (the backdrop on phones)', async ({ page, isMobile }) => {
    const root = await open(page, 'date');
    if (isMobile) await page.mouse.click(10, 10); // top of the screen = backdrop
    else await page.mouse.click(700, 4); // empty page margin above the form
    await expect(root).toHaveCount(0);
  });

  test('clicks inside the panel keep it open', async ({ page }) => {
    const root = await open(page, 'date');
    await root.locator('.ndp-cal-label').first().click();
    await expect(root.locator('.ndp-monthgrid')).toBeVisible();
  });
});

test.describe('day selection', () => {
  test('picking a day sets the value, the hidden submit field, and closes', async ({ page }) => {
    const root = await open(page, 'date');
    // Value is 2024-04-15 → BS 2081-01-03; pick BS day 10 of the same month.
    await root.locator('.ndp-cell:not(.ndp-cell--empty) .ndp-cell-primary', { hasText: new RegExp(`^${ne(10)}$`) }).click();
    await expect(root).toHaveCount(0);
    const value = await page.evaluate(() => window.pickers.date.getValue());
    expect(value.bs).toEqual({ year: 2081, month: 1, day: 10 });
    expect(await page.locator('input[name="date_value"]').inputValue()).toBe(value.value);
    expect(await page.evaluate(() => window.changes.date.length)).toBe(1);
  });

  test('month arrows step months', async ({ page }) => {
    const root = await open(page, 'date');
    const label = root.locator('.ndp-cal-label-primary');
    await expect(label).toContainText(`बैशाख ${ne(2081)}`);
    await root.getByRole('button', { name: 'Next month' }).click();
    await expect(label).toContainText(`जेठ ${ne(2081)}`);
    await root.getByRole('button', { name: 'Previous year' }).click();
    await expect(label).toContainText(`जेठ ${ne(2080)}`);
  });
});

test.describe('scrollable year view', () => {
  test('lists every supported year, opens centered on the current year, no paging arrows', async ({ page }) => {
    const root = await open(page, 'date');
    const grid = await openYearView(root);
    const cells = grid.locator('.ndp-yearcell');
    await expect(cells).toHaveCount(2100 - 1970 + 1);
    const selected = grid.locator('.ndp-yearcell.is-selected');
    await expect(selected).toHaveText(new RegExp(`^${ne(2081)}`));
    await expect(selected).toBeInViewport({ ratio: 1 });
    // Selected year is roughly centered in the scroll box.
    const g = (await grid.boundingBox())!;
    const s = (await selected.boundingBox())!;
    expect(Math.abs((s.y + s.height / 2) - (g.y + g.height / 2))).toBeLessThan(s.height);
    // Grid scrolls; the header has no visible paging arrows.
    expect(await grid.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await expect(root.locator('.ndp-cal-header .ndp-nav:not(.is-hidden)')).toHaveCount(0);
  });

  test('scrolling the year grid moves through years without closing or moving the popup', async ({ page, isMobile }) => {
    const root = await open(page, 'date');
    const grid = await openYearView(root);
    const panel = root.locator('.ndp-panel');
    const before = (await panel.boundingBox())!;
    const startTop = await grid.evaluate((el) => el.scrollTop);
    if (isMobile) {
      await grid.evaluate((el) => { el.scrollTop += 400; });
    } else {
      const g = (await grid.boundingBox())!;
      await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
      await page.mouse.wheel(0, 400);
    }
    await expect.poll(() => grid.evaluate((el) => el.scrollTop)).toBeGreaterThan(startTop + 100);
    await expect(root.locator('.ndp-panel')).toBeVisible();
    const after = (await panel.boundingBox())!;
    expect(after.y).toBeCloseTo(before.y, 0);
    // The page itself didn't scroll along (overscroll is contained).
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('pick a far year → month → day lands on that date', async ({ page }) => {
    const root = await open(page, 'date');
    const grid = await openYearView(root);
    const target = grid.locator('.ndp-yearcell', { has: page.locator('.ndp-yearcell-bs', { hasText: new RegExp(`^${ne(2050)}$`) }) });
    await target.scrollIntoViewIfNeeded();
    await target.click();
    await expect(root.locator('.ndp-monthgrid')).toBeVisible();
    await expect(root.locator('.ndp-cal-label-primary')).toContainText(ne(2050));
    await root.locator('.ndp-monthcell').nth(3).click(); // Shrawan (month 4)
    await expect(root.locator('.ndp-grid')).toBeVisible();
    await expect(root.locator('.ndp-cal-label-primary')).toContainText(`श्रावण ${ne(2050)}`);
    await root.locator('.ndp-cell:not(.ndp-cell--empty)').first().click();
    const value = await page.evaluate(() => window.pickers.date.getValue());
    expect(value.bs).toEqual({ year: 2050, month: 4, day: 1 });
  });

  test('edge years are reachable: first and last supported year', async ({ page }) => {
    const root = await open(page, 'date');
    const grid = await openYearView(root);
    await grid.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    const last = grid.locator('.ndp-yearcell').last();
    await expect(last).toHaveText(new RegExp(`^${ne(2100)}`));
    await expect(last).toBeInViewport();
    await grid.evaluate((el) => { el.scrollTop = 0; });
    const first = grid.locator('.ndp-yearcell').first();
    await expect(first).toHaveText(new RegExp(`^${ne(1970)}`));
    await first.click();
    await expect(root.locator('.ndp-cal-label-primary')).toContainText(ne(1970));
  });

  test('year header label goes back to the day view', async ({ page }) => {
    const root = await open(page, 'date');
    await openYearView(root);
    await root.locator('.ndp-cal-label').first().click();
    await expect(root.locator('.ndp-grid')).toBeVisible();
  });

  test('AD mode lists AD years', async ({ page }) => {
    await page.locator('#date').locator('xpath=..').locator('.ndp-mode-toggle').click();
    const root = await open(page, 'date');
    const grid = await openYearView(root);
    await expect(grid.locator('.ndp-yearcell.is-selected .ndp-yearcell-bs')).toHaveText('2024');
    const target = grid.locator('.ndp-yearcell', { has: page.locator('.ndp-yearcell-bs', { hasText: /^1999$/ }) });
    await target.scrollIntoViewIfNeeded();
    await target.click();
    await expect(root.locator('.ndp-cal-label-primary')).toContainText('1999');
  });

  test('range picker: year view scrolls and picks', async ({ page }) => {
    const root = await open(page, 'range');
    const grid = await openYearView(root);
    const target = grid.locator('.ndp-yearcell', { has: page.locator('.ndp-yearcell-bs', { hasText: new RegExp(`^${ne(2075)}$`) }) });
    await target.scrollIntoViewIfNeeded();
    await target.click();
    await expect(root.locator('.ndp-cal-label-primary')).toContainText(ne(2075));
  });

  test('month picker: year view scrolls and picks, then month commits', async ({ page }) => {
    const root = await open(page, 'month');
    await root.locator('.ndp-cal-label').first().click();
    const grid = root.locator('.ndp-yeargrid');
    await expect(grid).toBeVisible();
    await expect(grid.locator('.ndp-yearcell.is-selected')).toBeInViewport({ ratio: 1 });
    const target = grid.locator('.ndp-yearcell', { has: page.locator('.ndp-yearcell-bs', { hasText: new RegExp(`^${ne(2060)}$`) }) });
    await target.scrollIntoViewIfNeeded();
    await target.click();
    await root.locator('.ndp-monthcell').nth(2).click();
    const value = await page.evaluate(() => window.pickers.month.getValue());
    expect({ year: value.year, month: value.month }).toEqual({ year: 2060, month: 3 });
  });
});

test.describe('range selection', () => {
  test('preset + Apply sets the range', async ({ page }) => {
    const root = await open(page, 'range');
    await root.locator('.ndp-preset', { hasText: 'Last 7 days' }).click();
    await root.locator('.ndp-apply', { hasText: 'Apply' }).click();
    const value = await page.evaluate(() => window.pickers.range.getValue());
    expect(Math.round((value.end.getTime() - value.start.getTime()) / 86400000)).toBe(6); // 7 days including today
  });

  test('fiscal-year submenu chips open and select', async ({ page }) => {
    const root = await open(page, 'range');
    await root.getByRole('button', { name: 'Fiscal Year', exact: true }).click();
    const item = root.locator('.ndp-submenu-item').first();
    await item.scrollIntoViewIfNeeded();
    await item.click();
    await root.locator('.ndp-apply', { hasText: 'Apply' }).click();
    const value = await page.evaluate(() => window.pickers.range.getValue());
    expect(value.startBs.month).toBe(4);
    expect(value.startBs.day).toBe(1);
  });

  test('custom range: two taps pick start and end', async ({ page }) => {
    const root = await open(page, 'range');
    await root.locator('.ndp-preset', { hasText: 'Custom Range' }).click();
    const days = root.locator('.ndp-cell:not(.ndp-cell--empty):not(.is-disabled)');
    await days.nth(4).click();
    await days.nth(11).click();
    await root.locator('.ndp-apply', { hasText: 'Apply' }).click();
    const value = await page.evaluate(() => window.pickers.range.getValue());
    expect(value.endBs.day - value.startBs.day).toBe(7);
  });
});

test.describe('desktop positioning', () => {
  test('popup follows the input when the page scrolls', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the bottom sheet is docked, not anchored');
    const root = await open(page, 'date');
    const panel = root.locator('.ndp-panel');
    await page.mouse.wheel(0, 60);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect.poll(async () => {
      const input = (await page.locator('#date').boundingBox())!;
      const box = (await panel.boundingBox())!;
      return Math.abs(box.y - (input.y + input.height + 6));
    }).toBeLessThan(2);
  });
});

test.describe('keyboard', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard navigation is a desktop concern');

  const focusedDay = (page: Page) => page.evaluate(() => document.activeElement?.getAttribute('data-ndp-day') ?? null);

  test('Alt+↓ enters the grid; arrows, PageDown move; Enter picks and focus returns to the field', async ({ page }) => {
    const root = await open(page, 'date'); // value 2024-04-15 = BS 2081-01-03
    await page.keyboard.press('Alt+ArrowDown');
    expect(await focusedDay(page)).toBe('2024-4-15');
    await page.keyboard.press('ArrowRight');
    expect(await focusedDay(page)).toBe('2024-4-16');
    await page.keyboard.press('ArrowDown');
    expect(await focusedDay(page)).toBe('2024-4-23');
    await page.keyboard.press('Home');
    expect(await focusedDay(page)).toBe('2024-4-21'); // Sunday
    await page.keyboard.press('PageDown'); // next month, same day — turns the page
    expect(await focusedDay(page)).toBe('2024-5-21');
    await expect(root.locator('.ndp-cal-label-primary')).toContainText('जेठ');
    await page.keyboard.press('Enter');
    await expect(root).toHaveCount(0);
    const value = await page.evaluate(() => window.pickers.date.getValue());
    expect(value.value).toBe('2024-05-21');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('date');
    await page.waitForTimeout(100);
    await expect(popup(page)).toHaveCount(0); // returning focus didn't reopen it
  });

  test('Escape inside the popup closes it and returns focus to the field', async ({ page }) => {
    await open(page, 'date');
    await page.keyboard.press('Alt+ArrowDown');
    await page.keyboard.press('Escape');
    await expect(popup(page)).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('date');
  });

  test('range: pick start and end from the keyboard', async ({ page }) => {
    const root = await open(page, 'range');
    await root.locator('.ndp-preset', { hasText: 'Custom Range' }).click();
    await root.locator('[data-ndp-entry]').focus();
    const start = await focusedDay(page);
    await page.keyboard.press('Enter');
    await expect(root.locator('.ndp-range-hint')).toContainText('end date');
    expect(await focusedDay(page)).toBe(start); // focus survives the re-render
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await root.locator('.ndp-apply', { hasText: 'Apply' }).click();
    const value = await page.evaluate(() => window.pickers.range.getValue());
    expect(Math.round((value.end - value.start) / 86400000)).toBe(7);
  });

  test('month picker: Alt+↓ focuses the selected month', async ({ page }) => {
    await open(page, 'month');
    await page.keyboard.press('Alt+ArrowDown');
    expect(await page.evaluate(() => document.activeElement?.classList.contains('ndp-monthcell'))).toBe(true);
  });
});
