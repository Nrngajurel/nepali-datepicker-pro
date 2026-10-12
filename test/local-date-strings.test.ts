// Date-only ISO strings ('2025-01-05') name a calendar day. `new Date(str)`
// reads them as UTC midnight, which is the *previous* local day west of UTC —
// so bounds and values must be parsed as local dates. Node honours a runtime
// change to process.env.TZ, so each test pins a timezone where the bug shows.
import assert from 'node:assert/strict';
import { afterEach, test } from 'vitest';

import { isDayDisabled, resolveBound } from '../src/application/constraints';
import { nativeDateMath } from '../src/date-math/native-date-math';
import { parseDateValue } from '../src/format/index';

const originalTz = process.env.TZ;
afterEach(() => {
  process.env.TZ = originalTz;
});

test('minDate/maxDate strings land on the named day west of UTC', () => {
  process.env.TZ = 'America/New_York';
  const min = resolveBound('2025-01-05')!;
  assert.equal(min.getFullYear(), 2025);
  assert.equal(min.getMonth(), 0);
  assert.equal(min.getDate(), 5);
  assert.equal(isDayDisabled(new Date(2025, 0, 4), { minDate: '2025-01-05' }), true, 'Jan 4 is before minDate');
  assert.equal(isDayDisabled(new Date(2025, 0, 5), { minDate: '2025-01-05' }), false, 'Jan 5 is allowed');
  assert.equal(isDayDisabled(new Date(2025, 0, 6), { maxDate: '2025-01-05' }), true);
});

test('parse and parseDateValue read date-only strings as local days; reject impossible dates', () => {
  process.env.TZ = 'America/Los_Angeles';
  for (const parsed of [nativeDateMath.parse('2024-04-13')!, parseDateValue('2024-04-13')!]) {
    assert.equal(parsed.getDate(), 13);
    assert.equal(parsed.getHours(), 0);
  }
  assert.equal(nativeDateMath.parse('2025-02-30'), null);
  assert.equal(parseDateValue('2025-02-30'), null);
  // Strings with a time/zone still go through the Date parser unchanged.
  assert.equal(parseDateValue('2024-04-13T00:00:00Z')!.toISOString(), '2024-04-13T00:00:00.000Z');
});
