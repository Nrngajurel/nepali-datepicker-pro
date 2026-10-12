// Date-range presets (span, freshness, bounds, change events), month
// arithmetic and Nepali AD month names.
import assert from 'node:assert/strict';
import { afterEach, test, vi } from 'vitest';

import { createDateRangeController } from '../src/application/date-range-controller';
import { defaultCalendarAdapter } from '../src/adapters/bs-ad-calendar-adapter';
import { nativeDateMath } from '../src/date-math/native-date-math';
import { formatDateValue } from '../src/format/index';

afterEach(() => {
  vi.useRealTimers();
});

const days = (start: Date, end: Date) => nativeDateMath.diff(end, start) + 1;

test('"Last N days" spans exactly N days, ending today', () => {
  const c = createDateRangeController({});
  for (const [id, n] of [['last7', 7], ['last15', 15], ['last30', 30], ['last60', 60]] as const) {
    c.selectPreset(id);
    const v = c.getValue()!;
    assert.equal(days(v.start, v.end), n, id);
    assert.equal(nativeDateMath.diff(v.end, new Date()), 0, `${id} ends today`);
  }
});

test('presets use the date they are clicked on, not the date the picker was created', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2024, 3, 13, 23, 59));
  const c = createDateRangeController({});
  vi.setSystemTime(new Date(2024, 3, 14, 0, 1)); // past midnight
  c.selectPreset('today');
  assert.equal(c.getValue()!.start.getDate(), 14);
});

test('presets are trimmed to minDate/maxDate; one entirely outside is ignored', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2024, 3, 20, 12));
  const c = createDateRangeController({ minDate: new Date(2024, 3, 15), maxDate: new Date(2024, 3, 18) });
  c.selectPreset('last30');
  const v = c.getValue()!;
  assert.equal(v.start.getDate(), 15, 'start trimmed to minDate');
  assert.equal(v.end.getDate(), 18, 'end trimmed to maxDate');
  c.selectPreset('today'); // Apr 20 is after maxDate
  assert.equal(c.getValue()!.end.getDate(), 18, 'out-of-bounds preset ignored, previous range kept');
});

test('picking a fiscal-year item fires onChange like the quick presets do', () => {
  const changes: unknown[] = [];
  const c = createDateRangeController({ onChange: (p) => changes.push(p) });
  const fy = c.getPresets().find((p) => p.id === 'fiscalYear')!;
  c.selectSubmenuItem('fiscalYear', fy.items![0].id);
  assert.equal(changes.length, 1);
  const v = c.getValue()!;
  assert.equal(v.startBs.month, 4, 'fiscal year starts on Shrawan 1');
  assert.equal(v.startBs.day, 1);
});

test('adding months clamps to the target month instead of overflowing', () => {
  const jan31 = new Date(2024, 0, 31);
  assert.equal(nativeDateMath.add(jan31, 1, 'month').toDateString(), new Date(2024, 1, 29).toDateString());
  assert.equal(nativeDateMath.add(jan31, -2, 'month').toDateString(), new Date(2023, 10, 30).toDateString());
  assert.equal(nativeDateMath.add(new Date(2024, 1, 29), 1, 'year').toDateString(), new Date(2025, 1, 28).toDateString());
  assert.equal(nativeDateMath.endOf(jan31, 'month').getDate(), 31, 'endOf(month) of Jan 31 stays in January');
});

test('AD mode in Nepali uses Gregorian month names in Nepali, not BS months', () => {
  const out = formatDateValue(new Date(2025, 0, 15), defaultCalendarAdapter, { mode: 'AD', format: 'DD MMMM YYYY', locale: 'ne' });
  assert.equal(out, '१५ जनवरी २०२५');
});
