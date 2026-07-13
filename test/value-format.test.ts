// @vitest-environment jsdom
// Configurable machine ("server") value: a fixed format/calendar reaches the
// form regardless of the display calendar — via submitName (auto hidden input),
// altField, and the onChange/event payload. Default is AD ISO.
import assert from 'node:assert/strict';
import { test, beforeEach } from 'vitest';

import { mountDateTimePicker, mountDateRangePicker, mountMonthPicker } from '../src/index';
import { formatMachineValue, stringifyMachineValue } from '../src/format/index';
import { defaultCalendarAdapter } from '../src/adapters/bs-ad-calendar-adapter';

beforeEach(() => { document.body.innerHTML = ''; });

const bs2081_01_01 = new Date(2024, 3, 13); // 2081-01-01 BS ⇄ 2024-04-13 AD

// --- pure formatter -------------------------------------------------------

test('formatMachineValue resolves each preset (AD ISO default, BS ISO, timestamp, date)', () => {
  const parts = { ad: new Date(2024, 3, 13, 9, 30, 0), bs: { year: 2081, month: 1, day: 1 }, time: { hour: 9, minute: 30, second: 0 } };
  const a = defaultCalendarAdapter;
  assert.equal(formatMachineValue(parts, 'iso', a), '2024-04-13');
  assert.equal(formatMachineValue(parts, 'iso', a, true), '2024-04-13T09:30');
  assert.equal(formatMachineValue(parts, 'iso-bs', a), '2081-01-01');
  assert.equal(formatMachineValue(parts, 'iso-bs', a, true), '2081-01-01 09:30');
  assert.equal(formatMachineValue(parts, 'timestamp', a), new Date(2024, 3, 13, 9, 30, 0).getTime());
  assert.ok(formatMachineValue(parts, 'date-object', a) instanceof Date);
  assert.equal(formatMachineValue(parts, { calendar: 'BS', format: 'YYYY/MM/DD' }, a), '2081/01/01');
});

test('stringifyMachineValue coerces Date and number to strings', () => {
  assert.equal(stringifyMachineValue(new Date(2024, 3, 13)), '2024-04-13');
  assert.equal(stringifyMachineValue(1712946600000), '1712946600000');
  assert.equal(stringifyMachineValue('2081-01-01'), '2081-01-01');
});

// --- results carry the machine value --------------------------------------

test('DateTimeResult.value is AD ISO by default', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountDateTimePicker(input, { value: bs2081_01_01 });
  assert.equal(inst.getValue()!.value, '2024-04-13', 'result carries AD ISO');
});

// --- submitName injects a hidden field that carries the machine value ------

test('submitName injects a hidden input with the AD ISO value while the display stays BS', () => {
  const input = document.createElement('input');
  input.setAttribute('name', 'visible_dob');
  document.body.appendChild(input);
  mountDateTimePicker(input, { value: bs2081_01_01, submitName: 'dob' });

  const hidden = document.querySelector<HTMLInputElement>('input[type=hidden][name=dob]')!;
  assert.ok(hidden, 'hidden submit field injected');
  assert.equal(hidden.value, '2024-04-13', 'hidden field carries AD ISO');
  assert.match(input.value, /२०८१/, 'visible input still shows Nepali BS');
  assert.equal(input.getAttribute('name'), null, 'visible input name removed so only the machine value submits');
});

test('the machine value is stable when the display calendar toggles BS↔AD', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountDateTimePicker(input, { value: bs2081_01_01, submitName: 'dob' });
  const hidden = document.querySelector<HTMLInputElement>('input[name=dob]')!;
  assert.equal(hidden.value, '2024-04-13');
  inst.update({ mode: 'AD' });
  assert.equal(hidden.value, '2024-04-13', 'value unchanged after switching display to AD');
});

test('valueFormat: iso-bs writes the BS ISO value', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  mountDateTimePicker(input, { value: bs2081_01_01, submitName: 'd', valueFormat: 'iso-bs' });
  assert.equal(document.querySelector<HTMLInputElement>('input[name=d]')!.value, '2081-01-01');
});

test('altField writes into an existing element, and clearing empties it', () => {
  const input = document.createElement('input');
  const alt = document.createElement('input');
  alt.id = 'alt';
  document.body.append(input, alt);
  const inst = mountDateTimePicker(input, { value: bs2081_01_01, altField: '#alt' });
  assert.equal(alt.value, '2024-04-13');
  inst.setValue(null);
  assert.equal(alt.value, '', 'alt field cleared with the value');
});

// --- range: pair of machine values ----------------------------------------

test('range submitName pair writes AD ISO start/end into two hidden fields', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  mountDateRangePicker(input, {
    value: { start: new Date(2024, 3, 13), end: new Date(2024, 3, 20) },
    submitName: { start: 'from', end: 'to' },
  });
  assert.equal(document.querySelector<HTMLInputElement>('input[name=from]')!.value, '2024-04-13');
  assert.equal(document.querySelector<HTMLInputElement>('input[name=to]')!.value, '2024-04-20');
});

test('DateRangeResult exposes startValue/endValue/value', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountDateRangePicker(input, { value: { start: new Date(2024, 3, 13), end: new Date(2024, 3, 20) } });
  const r = inst.getValue()!;
  assert.equal(r.startValue, '2024-04-13');
  assert.equal(r.endValue, '2024-04-20');
  assert.equal(r.value, '2024-04-13,2024-04-20');
});

// --- month ----------------------------------------------------------------

test('month picker submitName carries the AD ISO of the month first day', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountMonthPicker(input, { value: { year: 2081, month: 1 }, submitName: 'm' });
  assert.equal(document.querySelector<HTMLInputElement>('input[name=m]')!.value, '2024-04-13');
  assert.equal(inst.getValue()!.value, '2024-04-13');
});

// --- autoInit data-* ------------------------------------------------------

test('autoInit reads data-submit-name / data-value-format', () => {
  document.body.innerHTML = '<input id="dt" data-nepali-datepicker data-submit-name="dob" data-value-format="iso-bs">';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return import('../src/index').then(({ autoInit }) => {
    autoInit();
    const hidden = document.querySelector<HTMLInputElement>('input[name=dob]');
    assert.ok(hidden, 'hidden field created from data-submit-name');
  });
});
