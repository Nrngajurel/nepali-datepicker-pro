// @vitest-environment jsdom
// The production-readiness features: day-grid semantics and decorations,
// range rules (span limits, disabled days inside, Cancel, two months),
// presets, UI language, paste and typing order, validation / form
// integration, inline and disabled pickers, the year / time / multi-date
// pickers, the custom elements, and the option-surface guard.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, test } from 'vitest';

import {
  createDateRangeController,
  createDateTimeController,
  mountDateRangePicker,
  mountDateTimePicker,
  mountMonthPicker,
  mountMultiDatePicker,
  mountTimePicker,
  mountYearPicker,
} from '../src/index';
import { renderDateTimePanel, renderRangePanel } from '../src/render/dom';
import { computePopupPosition } from '../src/position/index';
import { mergeEvents, nepalFixedHolidays } from '../src/holidays';
import { parseLooseDate, looseToAd } from '../src/format/loose';
import { defaultCalendarAdapter as adapter } from '../src/adapters/bs-ad-calendar-adapter';

beforeEach(() => {
  document.body.innerHTML = '';
});

const APR_13_2024 = () => new Date(2024, 3, 13); // 2081-01-01 BS, a Saturday

function draw<C>(controller: C, render: (root: HTMLElement, c: C) => void): HTMLElement {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const redraw = () => render(root, controller);
  (controller as unknown as { onStateChange: (cb: () => void) => void }).onStateChange(redraw);
  redraw();
  return root;
}

function field(): HTMLInputElement {
  const input = document.createElement('input');
  document.body.appendChild(input);
  return input;
}

const cells = (root: ParentNode) => [...root.querySelectorAll<HTMLButtonElement>('.ndp-cell:not(.ndp-cell--empty)')];
const cellFor = (root: ParentNode, date: Date) => root.querySelector<HTMLButtonElement>(`[data-ndp-day="${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}"]`)!;

// ---- grid semantics -------------------------------------------------------------

test('day grid: weekday header row inside the grid, six week rows, labelled cells', () => {
  const c = createDateTimeController({ value: APR_13_2024() });
  const root = draw(c, renderDateTimePanel);
  const grid = root.querySelector('.ndp-grid')!;
  const rows = grid.querySelectorAll(':scope > [role="row"]');
  assert.equal(rows.length, 7, 'header row + 6 weeks');
  assert.equal(rows[0].querySelectorAll('[role="columnheader"]').length, 7);
  assert.ok(grid.getAttribute('aria-labelledby'), 'grid is labelled by the month title');
  const cell = cellFor(root, APR_13_2024());
  assert.match(cell.getAttribute('aria-label')!, /Saturday, 01 Baisakh 2081/);
  assert.equal(cell.getAttribute('aria-selected'), 'true');
});

test('weekStartsOn moves the first column and Home/End follow it', () => {
  const c = createDateTimeController({ value: APR_13_2024(), weekStartsOn: 1 });
  const root = draw(c, renderDateTimePanel);
  assert.equal(root.querySelector('.ndp-weekday')!.getAttribute('aria-label'), 'सोमबार', 'Monday first (BS labels in Nepali)');
  const cell = cellFor(root, APR_13_2024());
  cell.focus();
  cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  assert.equal(document.activeElement!.getAttribute('data-ndp-day'), '2024-4-8', 'Home goes to Monday');
});

test('weekendDays marks those columns (default Saturday)', () => {
  const root = draw(createDateTimeController({ value: APR_13_2024() }), renderDateTimePanel);
  assert.ok(cellFor(root, APR_13_2024()).classList.contains('is-weekend'));
  const custom = draw(createDateTimeController({ value: APR_13_2024(), weekendDays: [0] }), renderDateTimePanel);
  assert.ok(!cellFor(custom, APR_13_2024()).classList.contains('is-weekend'));
  assert.ok(cellFor(custom, new Date(2024, 3, 14)).classList.contains('is-weekend'));
});

test('today is aria-current="date"', () => {
  const root = draw(createDateTimeController({}), renderDateTimePanel);
  assert.equal(root.querySelectorAll('[aria-current="date"]').length, 1);
});

test('month grid: arrow keys move focus between months', () => {
  const c = createDateTimeController({ value: APR_13_2024() });
  const root = draw(c, renderDateTimePanel);
  root.querySelector<HTMLButtonElement>('.ndp-cal-label')!.click();
  const months = [...root.querySelectorAll<HTMLButtonElement>('.ndp-monthcell')];
  const entry = months.find((m) => m.tabIndex === 0)!;
  entry.focus();
  entry.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(document.activeElement, months[months.indexOf(entry) + 1]);
  assert.equal(months.filter((m) => m.tabIndex === 0).length, 1, 'one tab stop');
});

// ---- decorations ---------------------------------------------------------------------

test('dayCellProps: disable, class, badge, holiday; beforeShowDay still works', () => {
  const c = createDateTimeController({
    value: APR_13_2024(),
    dayCellProps: (date) => (date.getDate() === 15 ? { disabled: true, className: 'busy', badge: '3', title: 'Full' } : date.getDate() === 16 ? { holiday: true } : undefined),
    beforeShowDay: (date) => ({ selectable: date.getDate() !== 17 }),
  });
  const root = draw(c, renderDateTimePanel);
  const d15 = cellFor(root, new Date(2024, 3, 15));
  assert.ok(d15.classList.contains('is-disabled') && d15.classList.contains('busy'));
  assert.equal(d15.querySelector('.ndp-cell-badge')!.textContent, '3');
  assert.ok(cellFor(root, new Date(2024, 3, 16)).classList.contains('is-holiday'));
  assert.ok(cellFor(root, new Date(2024, 3, 17)).classList.contains('is-disabled'));
  c.selectDay(c.cellForBs(2081, 1, 3)); // AD Apr 15
  assert.equal(c.getValue()!.ad.getDate(), 13, 'a disabled day cannot be picked');
});

test('events: static list marks days; holidays are red and named for screen readers', () => {
  const c = createDateTimeController({
    value: APR_13_2024(),
    events: [{ date: '2081-01-01', calendar: 'BS', label: 'New Year', type: 'holiday' }, { date: '2024-04-20', label: 'Meeting', color: 'red' }],
  });
  const root = draw(c, renderDateTimePanel);
  const ny = cellFor(root, APR_13_2024());
  assert.ok(ny.classList.contains('is-holiday'));
  assert.match(ny.getAttribute('aria-label')!, /New Year/);
  const meeting = cellFor(root, new Date(2024, 3, 20));
  assert.equal(meeting.querySelectorAll('.ndp-dot').length, 1);
  assert.equal(meeting.title, 'Meeting');
});

test('events: an async loader re-renders when it resolves, once per month', async () => {
  let calls = 0;
  const c = createDateTimeController({
    value: APR_13_2024(),
    events: async () => {
      calls += 1;
      return [{ date: new Date(2024, 3, 22), label: 'Loaded' }];
    },
  });
  const root = draw(c, renderDateTimePanel);
  await new Promise((r) => setTimeout(r, 0));
  assert.match(cellFor(root, new Date(2024, 3, 22)).getAttribute('aria-label')!, /Loaded/);
  assert.equal(calls, 1, 'the re-render did not load the month again');
});

test('holidays sub-export: fixed national days in both calendars; mergeEvents combines sources', () => {
  const span = { start: new Date(2024, 3, 13), end: new Date(2024, 4, 13) };
  const loader = nepalFixedHolidays() as (s: typeof span) => Array<{ date: Date | string; label: string; calendar?: string }>;
  const events = loader(span);
  assert.ok(events.some((e) => e.label === 'Nepali New Year' && e.date === '2081-1-1'));
  assert.ok(events.some((e) => e.label === 'International Labour Day'));
  const merged = mergeEvents(nepalFixedHolidays({ language: 'ne' }), [{ date: '2024-04-20', label: 'Mine' }]) as (s: typeof span) => Array<{ label: string }>;
  const labels = merged(span).map((e) => e.label);
  assert.ok(labels.includes('नयाँ वर्ष') && labels.includes('Mine'));
});

// ---- range rules ------------------------------------------------------------------------

test('range: maxRangeSpanDays rules out days past the limit once the start is picked', () => {
  const c = createDateRangeController({ value: null, maxRangeSpanDays: 5 });
  c.update({ value: null });
  const start = c.cellForBs(2081, 1, 10);
  c.selectDay(start);
  assert.equal(c.isSelectable(c.cellForBs(2081, 1, 14)), true, '5 days incl. both ends');
  assert.equal(c.isSelectable(c.cellForBs(2081, 1, 15)), false, '6 days is too long');
  assert.equal(c.typedError('2081-01-10 – 2081-01-20'), 'span');
  assert.match(c.invalidMessage('span'), /5 days/);
});

test('range: a disabled day inside blocks the range unless allowDisabledInRange', () => {
  const disabledDates = (d: Date) => d.getFullYear() === 2024 && d.getMonth() === 3 && d.getDate() === 25;
  const blocked = createDateRangeController({ disabledDates });
  blocked.selectDay(blocked.cellForBs(2081, 1, 10)); // Apr 22
  assert.equal(blocked.isSelectable(blocked.cellForBs(2081, 1, 12)), true);
  assert.equal(blocked.isSelectable(blocked.cellForBs(2081, 1, 15)), false, 'past the disabled 25th');
  const allowed = createDateRangeController({ disabledDates, allowDisabledInRange: true });
  allowed.selectDay(allowed.cellForBs(2081, 1, 10));
  assert.equal(allowed.isSelectable(allowed.cellForBs(2081, 1, 15)), true);
});

test('range: Cancel restores what was there when the popup opened', () => {
  let cancelled = 0;
  const value = { start: new Date(2024, 3, 1), end: new Date(2024, 3, 5) };
  const c = createDateRangeController({ value, onCancel: () => { cancelled += 1; } });
  c.show();
  c.selectPreset('today');
  c.cancel();
  assert.equal(cancelled, 1);
  assert.equal(c.getValue()!.start.getDate(), 1);
  assert.equal(c.getState().isOpen, false);
});

test('range: two linked months render side by side and page together', () => {
  const c = createDateRangeController({ value: { start: new Date(2024, 3, 1), end: new Date(2024, 4, 10) }, numberOfMonths: 2 });
  c.show();
  const root = draw(c, renderRangePanel);
  assert.equal(root.querySelectorAll('.ndp-grid').length, 2);
  const titles = () => [...root.querySelectorAll('.ndp-cal-label-primary')].map((n) => n.firstChild!.textContent);
  const before = titles();
  root.querySelector<HTMLButtonElement>('[data-ndp-field="next-month-1"]')!.click();
  assert.equal(titles()[0], before[1], 'the right month moved to the left');
});

test('range: Apply is disabled until there is a range', () => {
  const c = createDateRangeController({});
  c.show();
  const root = draw(c, renderRangePanel);
  assert.ok(root.querySelector<HTMLButtonElement>('.ndp-apply')!.disabled);
});

test('presets: built-in ids, calendar-aware "this month"', () => {
  const c = createDateRangeController({ presets: ['today', 'next7', 'thisMonth', 'custom'] });
  assert.deepEqual(c.getPresets().map((p) => p.id), ['today', 'next7', 'thisMonth', 'custom']);
  c.selectPreset('thisMonth');
  const r = c.getValue()!;
  assert.equal(r.startBs.day, 1, 'starts on the 1st of the BS month');
  assert.equal(r.endBs.month, r.startBs.month);
  c.selectPreset('next7');
  const n = c.getValue()!;
  assert.equal(Math.round((n.end.getTime() - n.start.getTime()) / 86400000), 6);
});

// ---- language ------------------------------------------------------------------------------

test('language: Nepali UI text, and per-string overrides', () => {
  const c = createDateRangeController({ language: 'ne' });
  c.show();
  const root = draw(c, renderRangePanel);
  assert.equal(root.querySelector('.ndp-apply')!.textContent, 'लागू गर्नुहोस्');
  const d = createDateRangeController({ strings: { apply: 'Go' }, locale: { cancelLabel: 'Back' } });
  d.show();
  const r2 = draw(d, renderRangePanel);
  assert.equal(r2.querySelector('.ndp-apply')!.textContent, 'Go');
  assert.equal(r2.querySelector('.ndp-secondary')!.textContent, 'Back');
});

test('script: latin writes BS in English names and digits', () => {
  const root = draw(createDateTimeController({ value: APR_13_2024(), script: 'latin' }), renderDateTimePanel);
  assert.match(root.querySelector('.ndp-cal-label-primary')!.textContent!, /^Baisakh 2081/);
  assert.equal(cellFor(root, APR_13_2024()).querySelector('.ndp-cell-primary')!.textContent, '1');
});

// ---- typing, paste, validation, forms ----------------------------------------------------------

function paste(input: HTMLInputElement, text: string): void {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
  input.dispatchEvent(event);
}

test('paste: day-first, ISO, month names and Devanagari digits', () => {
  const input = field();
  const p = mountDateTimePicker(input, { displayFormat: 'DD/MM/YYYY' });
  paste(input, '15/01/2081');
  assert.deepEqual(p.getValue()!.bs, { year: 2081, month: 1, day: 15 });
  paste(input, '२०८१-०२-०५');
  assert.deepEqual(p.getValue()!.bs, { year: 2081, month: 2, day: 5 });
  paste(input, '29 June 2025'); // an AD month name: converted into the BS field
  assert.equal(p.getValue()!.ad.getMonth(), 5);
  const loose = parseLooseDate('Jestha 5, 2081', { mode: 'AD', adapter })!;
  assert.equal(looseToAd(loose, adapter)!.getTime(), adapter.bsToAd(2081, 2, 5).getTime());
});

test('typing order follows a numeric displayFormat', () => {
  const input = field();
  mountDateTimePicker(input, { displayFormat: 'DD/MM/YYYY' });
  assert.equal(input.placeholder, 'DD/MM/YYYY');
});

test('validation: a refused value shows a message, sets custom validity and calls onInvalid', () => {
  const input = field();
  const reasons: string[] = [];
  mountDateTimePicker(input, { minDate: new Date(2024, 3, 13), onInvalid: (reason) => reasons.push(reason), invalidBehavior: 'keep' });
  input.focus();
  for (const key of '20800101') input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  input.blur();
  assert.deepEqual(reasons, ['before-min']);
  const message = document.querySelector('.ndp-field-message')!;
  assert.match(message.textContent!, /on or after 2081-01-01/, 'the bound, in the field\'s calendar');
  assert.ok(input.getAttribute('aria-describedby')!.includes(message.id));
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(input.value, '2080-01-01', 'invalidBehavior: keep leaves the text to fix');
  const sentinel = document.querySelector<HTMLInputElement>('.ndp-validity')!;
  assert.equal(sentinel.validity.customError, true);
});

test('required: the form is invalid while the picker is empty', () => {
  const form = document.createElement('form');
  const input = document.createElement('input');
  form.appendChild(input);
  document.body.appendChild(form);
  const p = mountDateTimePicker(input, { required: true });
  assert.equal(form.checkValidity(), false);
  p.setValue(APR_13_2024());
  assert.equal(form.checkValidity(), true);
});

test('disabled: no popup, the field is disabled, and it toggles live', () => {
  const input = field();
  const p = mountDateTimePicker(input, { disabled: true });
  assert.ok(input.disabled);
  p.show();
  assert.equal(p.getState() && (p.getState() as { isOpen: boolean }).isOpen, false);
  p.update({ disabled: false });
  assert.ok(!input.disabled);
  p.show();
  assert.equal((p.getState() as { isOpen: boolean }).isOpen, true);
});

test('inline: the calendar is drawn in place and stays open', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const p = mountDateTimePicker(host, { inline: true, value: APR_13_2024() });
  assert.ok(host.querySelector('.ndp-panel-root.ndp-inline .ndp-grid'), 'drawn inside the host');
  assert.equal(host.querySelector('button.ndp-trigger'), null, 'no trigger button');
  p.hide();
  cells(host)[3].click();
  assert.ok(host.querySelector('.ndp-grid'), 'still showing after a pick');
});

test('calendar label: BS / AD shown after the value, switching with the mode', () => {
  const input = field();
  mountDateTimePicker(input, { value: APR_13_2024() });
  const label = () => document.querySelector('.ndp-cal-suffix')!.textContent;
  assert.equal(label(), 'BS');
  assert.equal(input.value, '2081-01-01', 'not part of the input value');
  document.querySelector<HTMLButtonElement>('.ndp-trigger-wrap .ndp-mode-toggle')!.click();
  assert.equal(label(), 'AD');
});

// ---- new pickers -----------------------------------------------------------------------------------

test('year picker: picking a year reports its first and last day', () => {
  const input = field();
  let result: { year: number; value: string } | null = null;
  mountYearPicker(input, { onChange: (r) => { result = r; } });
  input.click();
  const cell = [...document.querySelectorAll<HTMLButtonElement>('.ndp-yearcell')].find((b) => b.querySelector('.ndp-yearcell-bs')!.textContent === '२०८१')!;
  cell.click();
  assert.equal(result!.year, 2081);
  assert.equal(result!.value, '2024-04-13,2025-04-13');
});

test('time picker: typed time commits in 24h, displays per timeFormat', () => {
  const input = field();
  const p = mountTimePicker(input, {});
  input.focus();
  for (const key of '0205p') input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  input.blur();
  assert.equal(p.getValue()!.value, '14:05');
  assert.equal(p.getValue()!.formatted, '02:05 PM');
});

test('multi-date picker: toggling days, maxDates, joined machine value', () => {
  const input = field();
  const p = mountMultiDatePicker(input, { value: [APR_13_2024()], maxDates: 2, submitName: 'days' });
  input.click();
  cellFor(document, new Date(2024, 3, 20)).click();
  cellFor(document, new Date(2024, 3, 21)).click(); // over the limit: ignored
  assert.equal(p.getValue()!.value, '2024-04-13,2024-04-20');
  cellFor(document, APR_13_2024()).click(); // toggles off
  assert.equal(p.getValue()!.dates.length, 1);
  assert.equal(document.querySelector<HTMLInputElement>('input[name="days"]')!.value, '2024-04-20');
});

test('month picker: minMonth / disabledMonths', () => {
  const input = field();
  mountMonthPicker(input, { value: { year: 2081, month: 5 }, minMonth: { year: 2081, month: 3 }, disabledMonths: (_y, m) => m === 7 });
  input.click();
  const months = [...document.querySelectorAll<HTMLButtonElement>('.ndp-monthcell')];
  assert.ok(months[1].classList.contains('is-disabled'));
  assert.ok(months[6].classList.contains('is-disabled'));
  assert.ok(!months[3].classList.contains('is-disabled'));
});

// ---- custom elements ---------------------------------------------------------------------------------

test('custom element: attributes become options; name submits the machine value', async () => {
  await import('../src/element');
  document.body.innerHTML = '<form><nepali-date-picker name="dob" value="2024-04-13"></nepali-date-picker></form>';
  const el = document.querySelector('nepali-date-picker') as HTMLElement & { value: { ad: Date } };
  assert.equal(document.querySelector<HTMLInputElement>('input[name="dob"]')!.value, '2024-04-13');
  assert.equal(el.value.ad.getDate(), 13);
  el.setAttribute('mode', 'AD');
  assert.equal(el.querySelector<HTMLInputElement>('.ndp-trigger')!.value, '2024-04-13');
});

// ---- positioning ---------------------------------------------------------------------------------------

test('position: caps a too-tall popup to the room, hides when the field is off screen', () => {
  const anchor = { top: 100, left: 10, width: 200, height: 40, bottom: 140, right: 210 };
  const capped = computePopupPosition(anchor, { width: 300, height: 900 }, { width: 1000, height: 600 }, {});
  assert.equal(capped.placementY, 'down');
  assert.equal(capped.maxHeight, 600 - 140 - 12);
  const off = computePopupPosition({ ...anchor, top: -300, bottom: -260 }, { width: 300, height: 200 }, { width: 1000, height: 600 }, {});
  assert.equal(off.anchorHidden, true);
});

// ---- the option surface ----------------------------------------------------------------------------

test('every documented option is read somewhere outside types.ts', () => {
  const types = readFileSync('src/types.ts', 'utf8');
  const interfaces = ['CommonPickerOptions', 'DayGridOptions', 'DateTimePickerOptions', 'DateRangePickerOptions', 'MonthPickerOptions', 'YearPickerOptions', 'TimePickerOptions', 'MultiDatePickerOptions', 'RangePickerLocale'];
  const keys = new Set<string>();
  interfaces.forEach((name) => {
    const body = new RegExp(`interface ${name}[^{]*\\{([\\s\\S]*?)\\n\\}`).exec(types)![1];
    for (const m of body.matchAll(/^\s{2}(\w+)\?:/gm)) keys.add(m[1]);
  });
  const files: string[] = [];
  const walk = (dir: string) => readdirSync(dir).forEach((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(f) && p !== join('src', 'types.ts')) files.push(readFileSync(p, 'utf8'));
  });
  walk('src');
  const source = files.join('\n');
  const deprecated = new Set(['weekLabel']);
  const unread = [...keys].filter((key) => !deprecated.has(key) && !new RegExp(`\\b${key}\\b`).test(source));
  assert.deepEqual(unread, [], `options declared but never read: ${unread.join(', ')}`);
});
