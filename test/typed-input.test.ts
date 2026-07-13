// @vitest-environment jsdom
// Typeable date/datetime input: masking as you type, live validation, and
// committing a parsed value on Enter/blur (BS + AD, with Nepali digits).
import assert from 'node:assert/strict';
import { test, beforeEach } from 'vitest';

import { maskTypedDate, tokenizeTyped, normalizeDigits, countDigits } from '../src/format/parse';
import { createDateTimeController } from '../src/application/date-time-controller';
import { mountDateTimePicker, mountDateRangePicker, mountMonthPicker } from '../src/index';

beforeEach(() => {
  document.body.innerHTML = '';
});

// --- pure masking / tokenizing --------------------------------------------

test('maskTypedDate inserts separators as digits arrive', () => {
  assert.equal(maskTypedDate('2081', false), '2081');
  assert.equal(maskTypedDate('208101', false), '2081-01');
  assert.equal(maskTypedDate('20810115', false), '2081-01-15');
  assert.equal(maskTypedDate('2081011599', false), '2081-01-15', 'extra digits dropped for date-only');
  assert.equal(maskTypedDate('208101150930', true), '2081-01-15 09:30');
});

test('maskTypedDate normalizes Nepali digits and ignores existing separators', () => {
  assert.equal(maskTypedDate('२०८१-०१-१५', false), '2081-01-15');
});

test('tokenizeTyped distinguishes empty, valid shape, and garbage', () => {
  assert.equal(tokenizeTyped('   '), 'empty');
  assert.equal(tokenizeTyped('hello'), null);
  assert.deepEqual(tokenizeTyped('2081-01-15'), { year: 2081, month: 1, day: 15 });
  assert.deepEqual(tokenizeTyped('2081-01-15 09:30'), { year: 2081, month: 1, day: 15, hour: 9, minute: 30 });
});

test('normalizeDigits and countDigits helpers', () => {
  assert.equal(normalizeDigits('२०८१'), '2081');
  assert.equal(countDigits('2081-01'), 6);
});

// --- controller validation / commit ---------------------------------------

test('validateTyped flags out-of-range and disabled dates as invalid (BS mode)', () => {
  const c = createDateTimeController({});
  assert.equal(c.validateTyped(''), 'empty');
  assert.equal(c.validateTyped('2081-01-15'), 'valid');
  assert.equal(c.validateTyped('2081-13-01'), 'invalid', 'month 13 rejected');
  assert.equal(c.validateTyped('2081-01-40'), 'invalid', 'day past month length rejected');
  assert.equal(c.validateTyped('1500-01-01'), 'invalid', 'year below supported range rejected');
});

test('validateTyped respects minDate', () => {
  const c = createDateTimeController({ minDate: new Date(2024, 3, 13) }); // 2081-01-01 BS
  assert.equal(c.validateTyped('2081-01-01'), 'valid');
  assert.equal(c.validateTyped('2080-12-30'), 'invalid', 'before minDate is invalid');
});

test('commitTyped selects the parsed date and syncs the view', () => {
  const c = createDateTimeController({});
  const status = c.commitTyped('2081-05-20');
  assert.equal(status, 'valid');
  assert.equal(c.getState().selected!.bs.month, 5);
  assert.equal(c.getState().selected!.bs.day, 20);
  assert.equal(c.getState().viewMonth, 5, 'calendar view follows the typed date');
});

test('commitTyped parses the time part when withTime is on', () => {
  const c = createDateTimeController({ withTime: true, value: new Date(2024, 3, 13) });
  assert.equal(c.commitTyped('2081-01-15 08:45'), 'valid');
  assert.equal(c.getState().time!.hour, 8);
  assert.equal(c.getState().time!.minute, 45);
});

test('commitTyped clears on empty and no-ops on invalid', () => {
  const c = createDateTimeController({ value: new Date(2024, 3, 13) });
  assert.ok(c.getState().selected);
  assert.equal(c.commitTyped(''), 'empty');
  assert.equal(c.getState().selected, null, 'empty clears the selection');

  c.commitTyped('2081-01-15');
  const before = c.getState().selected;
  assert.equal(c.commitTyped('2081-99-99'), 'invalid');
  assert.equal(c.getState().selected, before, 'invalid input leaves the value untouched');
});

test('commitTyped parses Gregorian dates in AD mode and rejects overflow', () => {
  const c = createDateTimeController({ mode: 'AD' });
  assert.equal(c.commitTyped('2024-02-29'), 'valid', '2024 is a leap year');
  assert.equal(c.getState().selected!.ad.getFullYear(), 2024);
  assert.equal(c.validateTyped('2023-02-29'), 'invalid', 'Feb 29 in a non-leap year is rejected');
});

test('commitTyped accepts Nepali digits', () => {
  const c = createDateTimeController({});
  assert.equal(c.commitTyped('२०८१-०१-१५'), 'valid');
  assert.equal(c.getState().selected!.bs.day, 15);
});

// --- mounted segmented editor (native-<input type=date> behaviour) --------

// Dispatch a keydown on the focused segmented input.
function key(input: HTMLInputElement, k: string) {
  input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
}
function type(input: HTMLInputElement, digits: string) {
  for (const d of digits) key(input, d);
}

test('typing digits fills sections with separators and auto-advances', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountDateTimePicker(input, {});
  input.dispatchEvent(new FocusEvent('focus'));

  type(input, '20810115'); // year 2081, month 01, day 15
  assert.equal(input.value, '2081-01-15', 'separators are always present and sections filled');
  assert.ok(!input.classList.contains('ndp-input-invalid'), 'a valid date is not flagged');

  input.dispatchEvent(new FocusEvent('blur'));
  assert.equal((inst.getState() as { selected: { bs: { month: number; day: number } } }).selected.bs.month, 1);
  assert.equal((inst.getState() as { selected: { bs: { day: number } } }).selected.bs.day, 15);
});

test('a disallowed date (before minDate) is flagged invalid live', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  mountDateTimePicker(input, { minDate: new Date(2024, 3, 13) }); // 2081-01-01 BS
  input.dispatchEvent(new FocusEvent('focus'));
  type(input, '20801230'); // 2080-12-30 BS — before minDate
  assert.ok(input.classList.contains('ndp-input-invalid'), 'a date before minDate is flagged');
  assert.equal(input.getAttribute('aria-invalid'), 'true');

  // per-section clamp keeps month within 1–12 (native behaviour)
  const input2 = document.createElement('input');
  document.body.appendChild(input2);
  mountDateTimePicker(input2, {});
  input2.dispatchEvent(new FocusEvent('focus'));
  type(input2, '2081'); type(input2, '13');
  assert.equal(input2.value.slice(5, 7), '12', 'month is clamped to 12, never 13');
});

test('Backspace clears the focused section', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  mountDateTimePicker(input, {});
  input.dispatchEvent(new FocusEvent('focus'));
  type(input, '20810115');
  assert.equal(input.value, '2081-01-15');
  // focus is on the last (day) section after auto-advance; Backspace clears it
  key(input, 'Backspace');
  assert.equal(input.value, '2081-01-DD', 'the day section is cleared back to its placeholder');
});

test('ArrowUp on an empty section seeds it, then steps; ArrowLeft moves sections', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  mountDateTimePicker(input, {});
  input.dispatchEvent(new FocusEvent('focus')); // starts on the year section
  key(input, 'ArrowRight'); // → month
  key(input, 'ArrowUp'); // seed month from today
  const firstMonth = input.value.slice(5, 7);
  assert.notEqual(firstMonth, 'MM', 'ArrowUp seeds the empty month section');
  key(input, 'ArrowUp'); // step it up by one
  assert.notEqual(input.value.slice(5, 7), firstMonth, 'a second ArrowUp steps the value');
});

test('editing a single section of an existing value keeps the others', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountDateTimePicker(input, { value: new Date(2024, 3, 13) }); // 2081-01-01 BS
  input.dispatchEvent(new FocusEvent('focus')); // seeds sections from 2081-01-01
  type(input, '2085'); // change only the year
  input.dispatchEvent(new FocusEvent('blur'));
  const bs = (inst.getState() as { selected: { bs: { year: number; month: number; day: number } } }).selected.bs;
  assert.deepEqual([bs.year, bs.month, bs.day], [2085, 1, 1], 'only the year changed');
});

test('blur reverts to empty when a fresh partial entry is left incomplete', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  mountDateTimePicker(input, { value: null });
  input.dispatchEvent(new FocusEvent('focus')); // no committed value → sections empty
  type(input, '2085'); // only the year, month/day still empty
  input.dispatchEvent(new FocusEvent('blur'));
  assert.equal(input.value, '', 'a partial fresh entry is discarded');
});

test('Escape discards the edit and closes', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountDateTimePicker(input, { value: new Date(2024, 3, 13) }); // 2081-01-01 BS
  input.dispatchEvent(new FocusEvent('focus'));
  type(input, '2099');
  key(input, 'Escape');
  assert.equal(normalizeDigits(input.value), '2081-01-01', 'reverts to the committed value');
  assert.equal((inst.getState() as { isOpen: boolean }).isOpen, false, 'Escape closes the popup');
});

test('withTime adds hour and minute sections (24h)', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountDateTimePicker(input, { withTime: true, value: null });
  input.dispatchEvent(new FocusEvent('focus'));
  assert.equal(input.value, 'YYYY-MM-DD HH:mm', 'time sections shown with separators');

  type(input, '20810115'); // date
  type(input, '0930'); // 09:30
  assert.equal(input.value, '2081-01-15 09:30');
  input.dispatchEvent(new FocusEvent('blur'));
  const t = (inst.getState() as { time: { hour: number; minute: number } }).time;
  assert.deepEqual([t.hour, t.minute], [9, 30], 'time committed');
});

test('12h mode shows an AM/PM section set with a/p keys', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountDateTimePicker(input, { withTime: true, timeFormat: '12h', value: null });
  input.dispatchEvent(new FocusEvent('focus'));
  assert.equal(input.value, 'YYYY-MM-DD hh:mm --', 'AM/PM placeholder present in 12h mode');

  type(input, '20810115');
  type(input, '0230'); // 02:30
  key(input, 'p'); // PM
  assert.equal(input.value, '2081-01-15 02:30 PM');
  input.dispatchEvent(new FocusEvent('blur'));
  assert.equal((inst.getState() as { time: { hour: number } }).time.hour, 14, '02:30 PM → 14:30');
});

test('ArrowUp toggles the AM/PM section', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  mountDateTimePicker(input, { withTime: true, timeFormat: '12h', value: new Date(2024, 3, 13, 9, 0, 0) });
  input.dispatchEvent(new FocusEvent('focus'));
  // move to the meridiem section (last) and read it
  for (let i = 0; i < 5; i += 1) key(input, 'ArrowRight');
  assert.equal(input.value.slice(-2), 'AM', 'starts AM for 09:00');
  key(input, 'ArrowUp');
  assert.equal(input.value.slice(-2), 'PM', 'ArrowUp toggles to PM');
});

test('toggling withTime via update() adds the time sections live', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountDateTimePicker(input, { value: null });
  input.dispatchEvent(new FocusEvent('focus'));
  assert.equal(input.value, 'YYYY-MM-DD', 'date-only initially');
  input.dispatchEvent(new FocusEvent('blur'));

  inst.update({ withTime: true });
  input.dispatchEvent(new FocusEvent('focus'));
  assert.equal(input.value, 'YYYY-MM-DD HH:mm', 'time sections appear after enabling withTime');
});

test('allowInput:false makes the input read-only', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  mountDateTimePicker(input, { allowInput: false });
  assert.equal(input.readOnly, true, 'input is not typeable when allowInput is false');
});

test('the datetime trigger is editable by default, even if pre-marked readonly', () => {
  const input = document.createElement('input');
  input.readOnly = true; // framework wrappers render read-only by default
  document.body.appendChild(input);
  mountDateTimePicker(input, {});
  assert.equal(input.readOnly, false, 'the mount unlocks the input for typing');
});

test('focus opens the picker; Escape closes it', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountDateTimePicker(input, {});
  const isOpen = () => (inst.getState() as { isOpen: boolean }).isOpen;

  input.dispatchEvent(new FocusEvent('focus'));
  assert.equal(isOpen(), true, 'focusing the field opens the popup');

  key(input, 'Escape');
  assert.equal(isOpen(), false, 'Escape closes the popup');
});

test('read-only field (allowInput:false) opens with ArrowDown and closes with Escape', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountDateTimePicker(input, { allowInput: false });
  const isOpen = () => (inst.getState() as { isOpen: boolean }).isOpen;

  key(input, 'ArrowDown');
  assert.equal(isOpen(), true, 'ArrowDown opens the read-only combobox');
  key(input, 'Escape');
  assert.equal(isOpen(), false, 'Escape closes it');
});

test('range and month triggers stay read-only (no typing yet)', () => {
  const r = document.createElement('input');
  const m = document.createElement('input');
  document.body.append(r, m);
  mountDateRangePicker(r, {});
  mountMonthPicker(m, {});
  assert.equal(r.readOnly, true, 'range input stays read-only');
  assert.equal(m.readOnly, true, 'month input stays read-only');
});
