// The date-time and range controllers share their calendar logic
// (src/application/calendar-core.ts). These pin the behaviour that moved there,
// so the two keep working exactly as before.
import assert from 'node:assert/strict';
import { test } from 'vitest';

import { createDateRangeController, createDateTimeController } from '../src/index';

test('range: typed text with times keeps each time with its own end, even typed backwards', () => {
  const c = createDateRangeController({ mode: 'AD', withTime: true });
  assert.equal(c.commitTyped('2024-04-20 17:45 – 2024-04-13 09:30'), 'valid');
  const v = c.getValue()!;
  assert.equal(v.start.getDate(), 13);
  assert.deepEqual([v.start.getHours(), v.start.getMinutes()], [9, 30]);
  assert.deepEqual([v.end.getHours(), v.end.getMinutes()], [17, 45]);
  assert.equal(c.typedString(), '2024-04-13 09:30 – 2024-04-20 17:45');
});

test('range: an end must have a time exactly when the picker has times', () => {
  const plain = createDateRangeController({ mode: 'AD' });
  assert.equal(plain.validateTyped('2024-04-13 – 2024-04-20'), 'valid');
  assert.equal(plain.validateTyped('2024-04-13 09:30 – 2024-04-20 10:00'), 'invalid');
  assert.equal(plain.validateTyped('2024-04-13'), 'invalid');
  assert.equal(plain.validateTyped('2024-04-13 – 2024-04-20 – 2024-04-21'), 'invalid');
  assert.equal(plain.validateTyped('2024-02-30 – 2024-03-02'), 'invalid', 'no calendar overflow');
  const timed = createDateRangeController({ mode: 'AD', withTime: true });
  assert.equal(timed.validateTyped('2024-04-13 – 2024-04-20'), 'invalid');
  assert.equal(timed.validateTyped('2024-04-13 09:30:15 – 2024-04-20 10:00:00'), 'invalid', 'no seconds on ranges');
  assert.equal(timed.validateTyped('2024-04-13 24:00 – 2024-04-20 10:00'), 'invalid');
});

test('range: BS typed text, Devanagari digits, and the reasons for refusing it', () => {
  const c = createDateRangeController({ minDate: new Date(2024, 3, 13), maxRangeSpanDays: 5 });
  assert.equal(c.validateTyped('२०८१-०१-०१ – २०८१-०१-०३'), 'valid');
  assert.equal(c.typedError('2080-12-30 – 2081-01-02'), 'before-min');
  assert.equal(c.typedError('2081-01-01 – 2081-01-10'), 'span');
  assert.equal(c.invalidMessage('span'), 'Up to 5 days');
  assert.match(c.invalidMessage('before-min'), /2081-01-01/);
  assert.equal(c.invalidMessage('unavailable'), c.getUi().strings.rangeHasDisabled);
});

test('range: switching BS/AD re-anchors an unlinked second month too', () => {
  const c = createDateRangeController({ mode: 'AD', numberOfMonths: 2, linkedCalendars: false, value: { start: new Date(2024, 3, 13), end: new Date(2024, 3, 20) } });
  c.navigateMonthAt(1, 2); // right-hand month (May) moves on its own
  const [, before] = c.visibleMonths();
  assert.deepEqual(before, { year: 2024, month: 7 });
  c.toggleMode();
  const [, after] = c.visibleMonths();
  assert.equal(c.getState().mode, 'BS');
  assert.deepEqual(after, { year: 2081, month: 3 }, '1 July 2024 is in Asar 2081');
});

test('date-time: navigation reports the month; range navigation works the same way', () => {
  const seen: Array<[number, number]> = [];
  const d = createDateTimeController({ mode: 'AD', value: new Date(2024, 0, 15), onChangeMonthYear: (y, m) => seen.push([y, m]) });
  d.navigateMonth(-1);
  d.navigateYear(1);
  d.selectMonthView(5);
  assert.deepEqual(seen, [[2023, 12], [2024, 12], [2024, 5]]);
  assert.equal(d.getState().view, 'day');

  const r = createDateRangeController({ mode: 'AD', value: { start: new Date(2024, 0, 15), end: new Date(2024, 0, 20) } });
  r.navigateMonth(-1);
  assert.deepEqual([r.getState().viewYear, r.getState().viewMonth], [2023, 12]);
  r.setView('year');
  r.selectYearView(2020);
  assert.deepEqual([r.getState().viewYear, r.getState().view], [2020, 'month']);
});

test('date-time: time rules (minTime/maxTime, disabledTimes, stepping, AM/PM) are unchanged', () => {
  const c = createDateTimeController({ withTime: true, minuteStep: 15, defaultTime: { hour: 9, minute: 0 }, minTime: { hour: 9, minute: 0 }, maxTime: { hour: 17, minute: 0 }, disabledTimes: (h, m) => h === 12 });
  assert.equal(c.isHourDisabled(8), true);
  assert.equal(c.isHourDisabled(12), true);
  assert.equal(c.isHourDisabled(13), false);
  assert.equal(c.isMinuteDisabled(17, 15), true);
  c.stepMinute(1);
  assert.deepEqual(c.getState().time, { hour: 9, minute: 15, second: 0 });
  c.stepHour(-1); // 08:15 is before minTime: clamped
  assert.deepEqual(c.getState().time, { hour: 9, minute: 0, second: 0 });
  c.toggleMeridiem(); // 21:00 is after maxTime: clamped
  assert.deepEqual(c.getState().time, { hour: 17, minute: 0, second: 0 });
  assert.equal(c.setHour(12), false);
  assert.equal(c.setHour(14), true);
});

test('range: end times step and flip AM/PM, rolling over', () => {
  const c = createDateRangeController({ withTime: true, minuteStep: 30, value: { start: new Date(2024, 3, 13, 23, 30), end: new Date(2024, 3, 14, 11, 0) } });
  c.stepRangeTime('start', 'minute', 1);
  assert.deepEqual(c.getState().startTime, { hour: 23, minute: 0, second: 0 }, 'minutes roll over within the hour');
  c.stepRangeTime('start', 'hour', 1);
  assert.deepEqual(c.getState().startTime, { hour: 0, minute: 0, second: 0 });
  c.toggleRangeMeridiem('end');
  assert.deepEqual(c.getState().endTime, { hour: 23, minute: 0, second: 0 });
});

test('both: listeners subscribe and unsubscribe; destroy drops them', () => {
  const d = createDateTimeController({ mode: 'AD' });
  let changes = 0;
  const off = d.onChange(() => { changes += 1; });
  d.commitTyped('2024-04-13');
  off();
  d.commitTyped('2024-04-14');
  assert.equal(changes, 1);
  let clears = 0;
  d.onClear(() => { clears += 1; });
  d.clear();
  assert.equal(clears, 1);
  const states: number[] = [];
  (d as unknown as { onStateChange(cb: () => void): void }).onStateChange(() => states.push(1));
  d.navigateMonth(1);
  assert.equal(states.length, 1);
  d.destroy();
  d.navigateMonth(1);
  assert.equal(states.length, 1);
});
