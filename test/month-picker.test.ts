// @vitest-environment jsdom
// Standalone Month Picker — selecting a BS month for monthly reports / payslips.
import assert from 'node:assert/strict';
import { test, beforeEach } from 'vitest';

import { createMonthPickerController } from '../src/application/month-picker-controller';
import { renderMonthPickerPanel } from '../src/render/dom';
import { mountMonthPicker, autoInit } from '../src/index';
import type { MonthResult } from '../src/index';

beforeEach(() => {
  document.body.innerHTML = '';
});

test('controller: selecting a month emits BS month + AD start/end range', () => {
  const results: MonthResult[] = [];
  const c = createMonthPickerController({ value: { year: 2081, month: 1 }, onChange: (r) => results.push(r) });
  c.show();
  c.selectMonthView(4); // Shrawan 2081

  assert.equal(results.length, 1);
  const result = results[0];
  assert.equal(result.year, 2081);
  assert.equal(result.month, 4);
  // Shrawan 2081 spans 2024-07-16 .. 2024-08-16 (AD). Assert the boundaries are
  // the 1st and last day of the BS month.
  assert.equal(result.start.getFullYear(), 2024);
  assert.equal(result.start.getMonth() + 1, 7);
  assert.equal(result.start.getDate(), 16);
  assert.equal(result.end.getDate(), 16);
  assert.equal(result.end.getMonth() + 1, 8);
  assert.match(result.formatted, /Shrawan/, 'default locale is en');
});

test('controller: picking a month closes the picker', () => {
  const c = createMonthPickerController({});
  c.show();
  assert.equal(c.getState().isOpen, true);
  c.selectMonthView(2);
  assert.equal(c.getState().isOpen, false, 'commits and closes on month click');
});

test('render: shows a 12-month grid, header drills into a year grid', () => {
  const c = createMonthPickerController({ value: { year: 2081, month: 1 } });
  c.show();
  const root = document.createElement('div');
  (c as unknown as { onStateChange: (cb: () => void) => void }).onStateChange(() => renderMonthPickerPanel(root, c));
  renderMonthPickerPanel(root, c);

  assert.equal(root.querySelectorAll('.ndp-monthcell').length, 12, '12 months');
  assert.ok(root.querySelector('.ndp-monthcell.is-selected'), 'current month highlighted');

  root.querySelector<HTMLButtonElement>('.ndp-cal-label')!.click(); // month -> year
  assert.ok(root.querySelector('.ndp-yeargrid'), 'header click opens the year grid');
  root.querySelectorAll<HTMLButtonElement>('.ndp-yearcell:not(.ndp-yearcell--empty)')[7].click();
  assert.equal(c.getState().view, 'month', 'picking a year returns to the month grid');
});

test('mount: data-nepali-monthpicker auto-inits and writes the value on select', () => {
  document.body.innerHTML = '<input id="m" type="text" data-nepali-monthpicker readonly>';
  autoInit();
  const input = document.getElementById('m') as HTMLInputElement;
  input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const month = document.querySelector<HTMLButtonElement>('.ndp-panel--month .ndp-monthcell');
  assert.ok(month, 'month panel renders');
  month!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.notEqual(input.value, '', 'selected month is written into the input');
});

test('mount: emits select.nepaliMonthPicker with the report range', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountMonthPicker(input, { value: { year: 2081, month: 1 } });
  const details: MonthResult[] = [];
  input.addEventListener('select.nepaliMonthPicker', (e) => details.push((e as CustomEvent).detail));
  input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  document.querySelectorAll<HTMLButtonElement>('.ndp-monthcell')[5].click(); // Ashwin
  assert.equal(details.length, 1, 'event fired with detail');
  assert.ok(details[0].start instanceof Date && details[0].end instanceof Date);
  assert.equal((inst.getValue() as { month: number }).month, 6);
});
