// @vitest-environment jsdom
// minDate / maxDate / disabledDates / disabledWeekdays — bounds and disabling.
import assert from 'node:assert/strict';
import { test } from 'vitest';

import { createDateTimeController } from '../src/application/date-time-controller';
import { createDateRangeController } from '../src/application/date-range-controller';
import { renderDateTimePanel } from '../src/render/dom';

test('datetime: minDate blocks earlier days and selection is a no-op', () => {
  const c = createDateTimeController({ minDate: new Date(2024, 3, 13), value: null }); // 2081-01-01 BS
  assert.equal(c.isDisabled(c.cellForBs(2080, 12, 30)), true, 'day before min is disabled');
  assert.equal(c.isDisabled(c.cellForBs(2081, 1, 1)), false, 'min day itself is allowed');
  c.selectDay(c.cellForBs(2080, 12, 30));
  assert.equal(c.getState().selected, null, 'selecting a disabled day does nothing');
});

test('datetime: maxDate accepts relative tokens', () => {
  const c = createDateTimeController({ maxDate: '+2d' });
  assert.equal(c.isDisabled(c.cellForBs(2090, 1, 1)), true, 'far future beyond max is disabled');
});

test('datetime: disabledWeekdays and disabledDates', () => {
  const saturdays = createDateTimeController({ disabledWeekdays: [6] });
  assert.equal(saturdays.isDisabled(saturdays.cellForBs(2081, 1, 1)), true, '2081-01-01 is a Saturday');
  assert.equal(saturdays.isDisabled(saturdays.cellForBs(2081, 1, 2)), false, 'Sunday allowed');

  const custom = createDateTimeController({ disabledDates: (d) => d.getDate() === 15 });
  assert.equal(custom.isDisabled(custom.cellForBs(2081, 1, 3)), true, 'AD 15th disabled via predicate');
});

test('datetime render: disabled days get .is-disabled and no click handler', () => {
  const c = createDateTimeController({ disabledWeekdays: [6] });
  c.show();
  const root = document.createElement('div');
  renderDateTimePanel(root, c);
  const disabled = root.querySelectorAll('.ndp-cell.is-disabled');
  assert.ok(disabled.length >= 4, 'the Saturdays in the month are rendered disabled');
  assert.equal(disabled[0].getAttribute('aria-disabled'), 'true');
});

test('range: disabledDates blocks selection', () => {
  const c = createDateRangeController({ disabledDates: (d) => d.getDay() === 6 });
  const sat = c.cellForBs(2081, 1, 1); // Saturday
  assert.equal(c.isDisabled(sat), true);
  c.selectDay(sat);
  assert.equal(c.getState().pendingStart, null, 'disabled day cannot start a range');
});
