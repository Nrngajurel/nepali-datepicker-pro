// @vitest-environment jsdom
// Month/year selection views (click the header to drill down) and the custom
// range picker's visible "pick start / pick end" feedback.
import assert from 'node:assert/strict';
import { test } from 'vitest';

import { createDateTimeController } from '../src/application/date-time-controller';
import { createDateRangeController } from '../src/application/date-range-controller';
import { renderDateTimePanel, renderRangePanel } from '../src/render/dom';
import { defaultCalendarAdapter } from '../src/adapters/bs-ad-calendar-adapter';

const base = () => new Date(2024, 3, 13); // 2081-01-01 BS

function render(controller: { getState(): { isOpen: boolean } }, kind: 'datetime' | 'range') {
  const root = document.createElement('div');
  const draw = () => (kind === 'datetime'
    ? renderDateTimePanel(root, controller as never)
    : renderRangePanel(root, controller as never));
  (controller as unknown as { onStateChange: (cb: () => void) => void }).onStateChange(draw);
  draw();
  return root;
}

test('datetime: clicking the header opens the month view, picking a month returns to day', () => {
  const c = createDateTimeController({ withTime: true, value: base() });
  c.show();
  const root = render(c, 'datetime');

  assert.equal(root.querySelector('.ndp-monthgrid'), null, 'starts in day view');
  root.querySelector<HTMLButtonElement>('.ndp-cal-label')!.click();
  assert.ok(root.querySelector('.ndp-monthgrid'), 'header click shows the 12-month grid');
  assert.equal(root.querySelectorAll('.ndp-monthcell').length, 12);
  // time panel hidden while navigating months
  assert.equal(root.querySelector('.ndp-time-panel'), null, 'time panel hidden in month view');

  root.querySelectorAll<HTMLButtonElement>('.ndp-monthcell')[6].click(); // 7th month = Kartik
  assert.equal(c.getState().viewMonth, 7);
  assert.equal(c.getState().view, 'day', 'back to day view after picking a month');
  assert.ok(root.querySelector('.ndp-grid'), 'day grid restored');
});

test('datetime: month view → header → year view → pick year drills back to month', () => {
  const c = createDateTimeController({ value: base() });
  c.show();
  const root = render(c, 'datetime');
  root.querySelector<HTMLButtonElement>('.ndp-cal-label')!.click(); // day -> month
  root.querySelector<HTMLButtonElement>('.ndp-cal-label')!.click(); // month -> year
  assert.ok(root.querySelector('.ndp-yeargrid'), 'year grid shows');
  const years = [...root.querySelectorAll('.ndp-yearcell:not(.ndp-yearcell--empty)')] as HTMLButtonElement[];
  assert.ok(years.length > 0);
  years[0].click();
  assert.equal(c.getState().view, 'month', 'picking a year returns to month view');
});

test('range: month/year view works the same way', () => {
  const c = createDateRangeController({});
  c.show();
  const root = render(c, 'range');
  root.querySelector<HTMLButtonElement>('.ndp-cal-label')!.click();
  assert.ok(root.querySelector('.ndp-monthgrid'), 'range picker also gets the month view');
  root.querySelectorAll<HTMLButtonElement>('.ndp-monthcell')[0].click();
  assert.equal(c.getState().viewMonth, 1);
  assert.equal(c.getState().view, 'day');
});

test('range: clicking "Custom Range" shows a visible pick-start hint', () => {
  const c = createDateRangeController({});
  c.show();
  const root = render(c, 'range');
  assert.equal(root.querySelector('.ndp-range-hint'), null, 'no hint initially');

  const custom = [...root.querySelectorAll('.ndp-preset')].find((b) => /Custom/.test(b.textContent || '')) as HTMLButtonElement;
  custom.click();
  const hint = root.querySelector('.ndp-range-hint');
  assert.ok(hint, 'custom range shows a guidance hint');
  assert.match(hint!.textContent || '', /start/i);

  // pick a start day -> hint switches to "pick end", End field goes active
  root.querySelector<HTMLButtonElement>('.ndp-cell:not(.ndp-cell--empty)')!.click();
  assert.match(root.querySelector('.ndp-range-hint')!.textContent || '', /end/i);
  assert.ok(root.querySelectorAll('.ndp-ig-field.is-active').length >= 1, 'an input-group field is highlighted');
});

test('range: hover does not thrash (guards the render loop that broke selection)', () => {
  const c = createDateRangeController({});
  let renders = 0;
  (c as unknown as { onStateChange: (cb: () => void) => void }).onStateChange(() => { renders += 1; });
  const a = c.cellForBs(2081, 1, 5);
  const b = c.cellForBs(2081, 1, 12);

  c.hoverDay(a);
  assert.equal(renders, 0, 'hovering before the first click is a no-op');

  c.selectDay(a); // sets pendingStart -> 1 render
  renders = 0;
  c.hoverDay(b);
  c.hoverDay(b); // same cell again (as a re-render would re-fire) -> must NOT re-render
  assert.equal(renders, 1, 'hovering the same cell twice re-renders only once');
  c.hoverDay(a);
  assert.equal(renders, 2, 'hovering a different cell re-renders');
});

test('range: toggleMode flips BS/AD and is gated by allowModeToggle', () => {
  const c = createDateRangeController({});
  assert.equal(c.getState().mode, 'BS');
  c.toggleMode();
  assert.equal(c.getState().mode, 'AD');
  c.toggleMode();
  assert.equal(c.getState().mode, 'BS');

  const locked = createDateRangeController({ allowModeToggle: false });
  locked.toggleMode();
  assert.equal(locked.getState().mode, 'BS', 'no-op when mode toggle is disabled');
});

test('range: update({ mode }) switches the calendar system live', () => {
  const c = createDateRangeController({});
  c.update({ mode: 'AD' });
  assert.equal(c.getState().mode, 'AD');
});

test('range: "Pick a Month" preset switches to whole-month selection', () => {
  const c = createDateRangeController({ value: { start: base(), end: base() } });
  c.show();
  const root = render(c, 'range');
  assert.ok(root.querySelector('.ndp-grid'), 'starts in the day grid');

  // "Pick a Month" appears in the presets rail, next to Custom Range.
  const monthPreset = [...root.querySelectorAll<HTMLButtonElement>('.ndp-preset')].find((b) => b.textContent === 'Pick a Month')!;
  assert.ok(monthPreset, 'Pick a Month preset is in the rail');
  monthPreset.click();

  assert.ok(root.querySelector('.ndp-monthgrid--range'), 'month grid is shown');
  assert.equal(root.querySelector('.ndp-weekdays'), null, 'no day weekday row in month mode');

  const cells = () => [...root.querySelectorAll<HTMLButtonElement>('.ndp-monthcell')];
  cells()[6].click(); // 7th BS month — single click commits the whole month

  const range = c.getState().range!;
  assert.equal(range.start.bs.month, 7, 'range starts at the picked month');
  assert.equal(range.start.bs.day, 1, 'starts on the first day of the month');
  assert.equal(range.end.bs.month, 7, 'range ends in the same month');
  const y = range.end.bs.year;
  assert.equal(range.end.bs.day, defaultCalendarAdapter.daysInBsMonth(y, 7), 'ends on the last day of the month');
  assert.ok(root.querySelector('.ndp-monthcell.is-selected'), 'picked month is highlighted');
});

test('range: choosing another preset leaves month mode', () => {
  const c = createDateRangeController({ value: { start: base(), end: base() } });
  c.show();
  const root = render(c, 'range');
  c.startMonthSelect();
  assert.equal(c.getState().selectionUnit, 'month');
  c.selectPreset('today');
  assert.equal(c.getState().selectionUnit, 'day', 'back to day selection after a normal preset');
});
