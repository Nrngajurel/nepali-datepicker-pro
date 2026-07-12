// @vitest-environment jsdom
// Verifies the DateTime picker's time selection: the controller stepping logic
// (wrap, minuteStep, 12h/AM-PM, min/max clamp, "now") and that the renderer
// places an interactive time panel on the SAME screen as the calendar and wires
// its controls back to the controller.
import assert from 'node:assert/strict';
import { test } from 'vitest';

import { createDateTimeController } from '../src/application/date-time-controller';
import { renderDateTimePanel } from '../src/render/dom';

const base = () => new Date(2024, 3, 13, 10, 30, 0); // 2081-01-01 BS, 10:30:00

type WithStateChange = ReturnType<typeof createDateTimeController> & {
  onStateChange: (cb: () => void) => () => void;
};

test('time is null unless withTime is enabled', () => {
  assert.equal(createDateTimeController({ value: base() }).getState().time, null);
  assert.deepEqual(
    createDateTimeController({ withTime: true, value: base() }).getState().time,
    { hour: 10, minute: 30, second: 0 },
  );
});

test('update() live-patches options without remounting (docs live preview)', () => {
  const c = createDateTimeController({ value: base() });
  // Turning time on/off toggles the time panel state in place.
  c.update({ withTime: true });
  assert.notEqual(c.getState().time, null, 'withTime on derives a time');
  c.update({ withTime: false });
  assert.equal(c.getState().time, null, 'withTime off clears the time');
  // timeFormat and minuteStep reflect immediately.
  c.update({ withTime: true, timeFormat: '12h', minuteStep: 15 });
  assert.equal(c.getState().timeFormat, '12h');
  assert.equal(c.getState().minuteStep, 15);
});

test('stepHour / stepMinute wrap around', () => {
  const c = createDateTimeController({ withTime: true, value: new Date(2024, 3, 13, 23, 59, 0) });
  c.stepHour(1);
  assert.equal(c.getState().time!.hour, 0, 'hour wraps 23 -> 0');
  c.stepMinute(1);
  assert.equal(c.getState().time!.minute, 0, 'minute wraps 59 -> 0');
  c.stepHour(-1);
  assert.equal(c.getState().time!.hour, 23, 'hour wraps 0 -> 23');
});

test('minuteStep controls the minute increment', () => {
  const c = createDateTimeController({ withTime: true, minuteStep: 15, value: new Date(2024, 3, 13, 10, 0, 0) });
  c.stepMinute(1);
  assert.equal(c.getState().time!.minute, 15);
  c.stepMinute(1);
  assert.equal(c.getState().time!.minute, 30);
});

test('toggleMeridiem flips AM<->PM by 12 hours', () => {
  const c = createDateTimeController({ withTime: true, timeFormat: '12h', value: new Date(2024, 3, 13, 10, 0, 0) });
  c.toggleMeridiem();
  assert.equal(c.getState().time!.hour, 22, '10 AM -> 10 PM');
  c.toggleMeridiem();
  assert.equal(c.getState().time!.hour, 10, '10 PM -> 10 AM');
});

test('minTime / maxTime clamp the selected time', () => {
  const c = createDateTimeController({
    withTime: true,
    minTime: { hour: 9, minute: 0 },
    maxTime: { hour: 17, minute: 0 },
    value: new Date(2024, 3, 13, 12, 0, 0),
  });
  c.setTime(20, 0, 0);
  assert.deepEqual(c.getState().time, { hour: 17, minute: 0, second: 0 }, 'clamped to maxTime');
  c.setTime(6, 0, 0);
  assert.deepEqual(c.getState().time, { hour: 9, minute: 0, second: 0 }, 'clamped to minTime');
});

test('setTimeToNow sets a valid current time', () => {
  const c = createDateTimeController({ withTime: true, value: base() });
  c.setTimeToNow();
  const t = c.getState().time!;
  assert.ok(t.hour >= 0 && t.hour <= 23 && t.minute >= 0 && t.minute <= 59);
});

test('renders calendar and time panel together on one screen', () => {
  const c = createDateTimeController({ withTime: true, value: base() });
  c.show();
  const root = document.createElement('div');
  renderDateTimePanel(root, c);

  const body = root.querySelector('.ndp-datetime-body');
  assert.ok(body, 'has a shared body container');
  assert.ok(body!.querySelector('.ndp-grid'), 'calendar grid present in the body');
  const timePanel = body!.querySelector('.ndp-time-panel');
  assert.ok(timePanel, 'time panel present in the SAME body as the calendar');
  assert.equal(timePanel!.querySelectorAll('.ndp-spinner').length, 2);
  assert.ok(timePanel!.querySelector('.ndp-time-now'), 'has a Now button');
});

test('clicking the hour ▲ button steps the controller and re-renders', () => {
  const c = createDateTimeController({ withTime: true, value: new Date(2024, 3, 13, 10, 30, 0) });
  c.show();
  const root = document.createElement('div');
  (c as WithStateChange).onStateChange(() => renderDateTimePanel(root, c));
  renderDateTimePanel(root, c);

  const hourUp = root.querySelector('.ndp-spinner .ndp-spin-btn')!;
  hourUp.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.equal(c.getState().time!.hour, 11, 'hour advanced 10 -> 11');
  const hourValue = root.querySelector('.ndp-spinner .ndp-spin-value') as HTMLInputElement;
  assert.equal(hourValue.value, '11');
});

test('time picker has no seconds — hour and minute only', () => {
  const c = createDateTimeController({ withTime: true, value: base() });
  c.show();
  const root = document.createElement('div');
  renderDateTimePanel(root, c);
  const caps = [...root.querySelectorAll('.ndp-spin-cap')].map((n) => n.textContent);
  assert.deepEqual(caps, ['Hour', 'Min'], 'only Hour and Min spinners render');
});

test('12h format shows AM/PM control and 12-hour value', () => {
  const c = createDateTimeController({ withTime: true, timeFormat: '12h', value: new Date(2024, 3, 13, 14, 5, 0) });
  c.show();
  const root = document.createElement('div');
  renderDateTimePanel(root, c);
  const meridiem = root.querySelector('.ndp-meridiem');
  assert.ok(meridiem, 'AM/PM segmented control present');
  assert.equal(root.querySelector('.ndp-meridiem-btn.is-active')!.textContent, 'PM');
  assert.equal((root.querySelector('.ndp-spinner .ndp-spin-value') as HTMLInputElement).value, '02');
});
