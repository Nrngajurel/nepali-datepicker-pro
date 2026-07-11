// Conversion-correctness tests for the BS↔AD calendar engine — the one piece
// the spec calls "the actual product". Runs straight from src via Vitest and
// pins the engine against oracle-derived fixtures, so a regression in the data
// table or the day-counting arithmetic fails CI loudly.
import assert from 'node:assert/strict';
import { test } from 'vitest';

import { BsAdCalendarAdapter } from '../src/adapters/bs-ad-calendar-adapter';
import {
  BS_MONTH_LENGTHS_BY_YEAR,
  BS_YEAR_MIN,
  BS_YEAR_MAX,
} from '../src/calendar-data/bs-month-lengths';
import parity from './fixtures/bs-ad-parity.json';
import referenceMonthLengths from './fixtures/reference-month-lengths.json';

const adapter = new BsAdCalendarAdapter();

// Timezone-independent day index of a local-time Date. The engine builds Dates
// in local time; reading them via UTC-of-local-components makes every assertion
// below identical whether CI runs in UTC or Asia/Katmandu.
function dayIndex(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}

function adTriple(date: Date): [number, number, number] {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

const lengths = referenceMonthLengths as Record<string, number[]>;

test('vendored month-length table matches the reference bundle exactly', () => {
  const expectedYears = BS_YEAR_MAX - BS_YEAR_MIN + 1;
  assert.equal(Object.keys(lengths).length, expectedYears);
  for (let year = BS_YEAR_MIN; year <= BS_YEAR_MAX; year += 1) {
    assert.deepEqual(
      BS_MONTH_LENGTHS_BY_YEAR[year],
      lengths[year],
      `month lengths for BS ${year} drifted from the reference table`,
    );
  }
});

test('epoch anchor: 2000-09-17 BS === 1944-01-01 AD', () => {
  assert.deepEqual(adTriple(adapter.bsToAd(2000, 9, 17)), [1944, 1, 1]);
  assert.deepEqual(adapter.adToBs(new Date(1944, 0, 1)), { year: 2000, month: 9, day: 17 });
});

test('full-range sweep: round-trips every day AND advances AD by exactly 1', () => {
  let checked = 0;
  let previous: number | null = null;
  for (let year = BS_YEAR_MIN; year <= BS_YEAR_MAX; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const days = adapter.daysInBsMonth(year, month);
      for (let day = 1; day <= days; day += 1) {
        const ad = adapter.bsToAd(year, month, day);
        const bs = adapter.adToBs(ad);
        checked += 1;
        if (bs.year !== year || bs.month !== month || bs.day !== day) {
          assert.fail(`round-trip failed at ${year}-${month}-${day} -> ${JSON.stringify(bs)}`);
        }
        const index = dayIndex(ad);
        if (previous !== null) {
          assert.equal(index - previous, 1, `AD gap of ${index - previous} at BS ${year}-${month}-${day}`);
        }
        previous = index;
      }
    }
  }
  assert.ok(checked > 47000, `expected >47000 days checked, got ${checked}`);
});

test('bsToAd matches the reference oracle on every fixture pair (2001..2100)', () => {
  assert.ok(parity.length > 2000, `expected a large parity fixture, got ${parity.length}`);
  for (const { bs, ad } of parity as Array<{ bs: number[]; ad: number[] }>) {
    const [y, m, d] = bs;
    assert.deepEqual(adTriple(adapter.bsToAd(y, m, d)), ad, `bsToAd(${y},${m},${d}) disagreed with oracle`);
  }
});

test('adToBs inverts every fixture pair', () => {
  for (const { bs, ad } of parity as Array<{ bs: number[]; ad: number[] }>) {
    const [ay, am, ad2] = ad;
    assert.deepEqual(
      adapter.adToBs(new Date(ay, am - 1, ad2)),
      { year: bs[0], month: bs[1], day: bs[2] },
      `adToBs(${ay}-${am}-${ad2}) disagreed with oracle`,
    );
  }
});

test('daysInBsMonth agrees with the table and the AD span of each BS year', () => {
  for (let year = BS_YEAR_MIN; year <= BS_YEAR_MAX; year += 1) {
    let sum = 0;
    for (let month = 1; month <= 12; month += 1) {
      const days = adapter.daysInBsMonth(year, month);
      assert.equal(days, BS_MONTH_LENGTHS_BY_YEAR[year][month - 1]);
      sum += days;
    }
    if (year < BS_YEAR_MAX) {
      const span = dayIndex(adapter.bsToAd(year + 1, 1, 1)) - dayIndex(adapter.bsToAd(year, 1, 1));
      assert.equal(sum, span, `BS ${year} month-length sum (${sum}) != AD span (${span})`);
    }
  }
});

test('daysInBsMonth rejects unsupported year/month', () => {
  assert.throws(() => adapter.daysInBsMonth(BS_YEAR_MIN - 1, 1), RangeError);
  assert.throws(() => adapter.daysInBsMonth(BS_YEAR_MAX + 1, 1), RangeError);
  assert.throws(() => adapter.daysInBsMonth(2081, 0), RangeError);
  assert.throws(() => adapter.daysInBsMonth(2081, 13), RangeError);
});

test('bsToAd rejects out-of-range BS dates', () => {
  assert.throws(() => adapter.bsToAd(2081, 1, 0), RangeError);
  assert.throws(() => adapter.bsToAd(2081, 1, 40), RangeError);
  assert.throws(() => adapter.bsToAd(BS_YEAR_MIN - 1, 1, 1), RangeError);
});

test('todayBs is in range and consistent with adToBs(now)', () => {
  const today = adapter.todayBs();
  assert.ok(today.year >= BS_YEAR_MIN && today.year <= BS_YEAR_MAX);
  assert.deepEqual(today, adapter.adToBs(new Date()));
  assert.deepEqual(
    adapter.adToBs(adapter.bsToAd(today.year, today.month, today.day)),
    today,
  );
});
